import os
import shutil
import mimetypes
import folder_paths

from . import config
from . import utils
from typing import Literal


def get_file_content_type(filename: str):
    extension_mimetypes_cache = folder_paths.extension_mimetypes_cache

    extension = filename.split(".")[-1]
    content_type = None
    if extension not in extension_mimetypes_cache:
        mime_type, _ = mimetypes.guess_type(filename, strict=False)
        if mime_type:
            content_type = mime_type.split("/")[0]
            extension_mimetypes_cache[extension] = content_type
    else:
        content_type = extension_mimetypes_cache[extension]

    return content_type


def assert_file_type(filename: str, content_types: Literal["image", "video", "audio"]):
    content_type = get_file_content_type(filename)
    if not content_type:
        return False
    return content_type in content_types


class CacheHelper:
    def __init__(self) -> None:
        self.cache: dict[str, tuple[list, float]] = {}

    def get_cache(self, key: str):
        return self.cache.get(key, ([], 0))

    def set_cache(self, key: str, value: tuple[list, float]):
        self.cache[key] = value

    def rm_cache(self, key: str):
        if key in self.cache:
            del self.cache[key]


cache_helper = CacheHelper()


from concurrent.futures import ThreadPoolExecutor, as_completed


def scan_directory_items(directory: str):
    result, m_time = cache_helper.get_cache(directory)
    folder_m_time = os.path.getmtime(directory)

    if folder_m_time == m_time:
        return result

    result = []

    def get_file_info(entry: os.DirEntry[str]):
        filepath = entry.path
        is_dir = entry.is_dir()

        if not is_dir and not assert_file_type(filepath, ["image"]):
            return None

        stat = entry.stat()
        return {
            "name": entry.name,
            "type": "folder" if entry.is_dir() else get_file_content_type(filepath),
            "size": 0 if is_dir else stat.st_size,
            "createdAt": round(stat.st_ctime_ns / 1000000),
            "updatedAt": round(stat.st_mtime_ns / 1000000),
        }

    with os.scandir(directory) as it, ThreadPoolExecutor() as executor:
        future_to_entry = {executor.submit(get_file_info, entry): entry for entry in it}
        for future in as_completed(future_to_entry):
            file_info = future.result()
            if file_info is None:
                continue
            result.append(file_info)

    cache_helper.set_cache(directory, (result, os.path.getmtime(directory)))
    return result


async def create_file_or_folder(pathname: str, reader):
    real_pathname = utils.get_real_output_filepath(pathname)

    while True:
        part = await reader.next()
        if part is None:
            break

        name = part.name

        if name == "files":
            filename = part.filename
            filepath = f"{real_pathname}/{filename}"
            while True:
                if not os.path.exists(filepath):
                    break
                filepath_0 = os.path.splitext(filepath)[0]
                filepath_1 = os.path.splitext(filepath)[1]
                filepath = f"{filepath_0}(1){filepath_1}"

            utils.print_debug(f"Creating file: {filepath}")
            with open(filepath, "wb") as f:
                while True:
                    chunk = await part.read_chunk()
                    if not chunk:
                        break
                    f.write(chunk)

        if name == "folders":
            filename = await part.text()
            filepath = f"{real_pathname}/{filename}"
            if os.path.exists(filepath):
                raise RuntimeError(f"filename '{filename}' was existed.")
            utils.print_debug(f"Create folder: {filepath}")
            os.mkdir(filepath)


def rename_file(pathname: str, filename: str):
    real_pathname = utils.get_real_output_filepath(pathname)
    real_filename = utils.get_real_output_filepath(filename)
    shutil.move(real_pathname, real_filename)


def recursive_delete_files(file_list: list[str]):
    for file_path in file_list:
        real_path = utils.get_real_output_filepath(file_path)

        if os.path.isfile(real_path):
            os.remove(real_path)
        elif os.path.islink(real_path):
            os.unlink(real_path)
        elif os.path.isdir(real_path):
            shutil.rmtree(real_path)


from PIL import Image
from io import BytesIO


def get_image_data(filename: str):
    with Image.open(filename) as img:
        max_size = 128

        old_width, old_height = img.size
        scale = min(max_size / old_width, max_size / old_height)

        if scale >= 1:
            new_width, new_height = old_width, old_height
        else:
            new_width = int(old_width * scale)
            new_height = int(old_height * scale)

        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format="WEBP")
        img_byte_arr.seek(0)
        return img_byte_arr


import zipfile
import datetime


tmp_dir = os.path.join(config.extension_uri, "tmp")


async def package_file(root_dir: str, file_list: list[str]):
    zip_filename = f"{datetime.datetime.now().strftime('%Y%m%dT%H%M%SZ')}.zip"

    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)

    zip_temp_file = os.path.join(tmp_dir, zip_filename)
    real_root_dir = utils.get_real_output_filepath(root_dir)

    utils.print_debug(f"Creating zip file: {zip_temp_file}")
    utils.print_debug(f"Root directory: {root_dir}")
    utils.print_debug(f"Real root directory: {real_root_dir}")

    with zipfile.ZipFile(zip_temp_file, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in file_list:
            real_path = utils.get_real_output_filepath(file_path)
            filename = os.path.relpath(file_path, root_dir)

            if os.path.isfile(real_path):
                utils.print_debug(f"Adding file: {filename}")
                zip_file.write(real_path, filename)
            elif os.path.isdir(real_path):
                utils.print_debug(f"Checking sub directory: {filename}")
                for root, _, files in os.walk(real_path):
                    utils.print_debug(f"Find {root} files: {files}")
                    for file in files:
                        sub_real_path = os.path.join(root, file)
                        sub_dir = os.path.relpath(root, os.path.join(real_root_dir, filename))
                        sub_filename = os.path.join(filename, sub_dir, file)
                        utils.print_debug(f"Adding file: {sub_filename}")
                        zip_file.write(sub_real_path, sub_filename)
            else:
                utils.print_error(f"File not found: {real_path}")
    return zip_filename


async def get_temp_file_path(filename: str):
    return os.path.join(config.extension_uri, "tmp", filename)


import asyncio


class TemporaryFile:
    def __init__(self, file_path):
        self.file_path = file_path
        self.file = None
        self.loop = asyncio.get_event_loop()

    async def __aenter__(self):
        def open_file():
            self.file = open(self.file_path, "rb")
            return self.file

        self.file = await self.loop.run_in_executor(None, open_file)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.file:
            self.file.close()
        os.remove(self.file_path)

    async def read(self, size=-1):
        def sync_read():
            return self.file.read(size)

        return await self.loop.run_in_executor(None, sync_read)


def open_tmp_file(filepath: str):
    return TemporaryFile(filepath)
