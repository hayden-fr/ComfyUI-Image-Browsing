import os
import shutil
import mimetypes

from . import config
from . import utils


def get_file_mime_type(filename):
    mime_type, _ = mimetypes.guess_type(filename, strict=False)
    return mime_type


def asset_is_image(filename: str):
    mime_type = get_file_mime_type(filename)
    return mime_type is not None and mime_type.startswith("image")


def scan_directory_items(directory: str):
    try:
        items = os.listdir(directory)
        output: list[dict] = []

        for item in items:
            abs_path = os.path.join(directory, item)
            state = os.stat(abs_path)
            if os.path.isdir(abs_path):
                output.append(
                    {
                        "name": item,
                        "type": "folder",
                        "size": 0,
                        "createdAt": round(state.st_ctime_ns / 1000000),
                        "updatedAt": round(state.st_mtime_ns / 1000000),
                    }
                )
            elif os.path.isfile(abs_path) and asset_is_image(abs_path):
                output.append(
                    {
                        "name": item,
                        "type": "image",
                        "size": state.st_size,
                        "createdAt": round(state.st_ctime_ns / 1000000),
                        "updatedAt": round(state.st_mtime_ns / 1000000),
                    }
                )
        return output
    except:
        return []


def rename_file(pathname: str, filename: str):
    real_pathname = pathname.replace("/output", config.output_uri)
    real_filename = filename.replace("/output", config.output_uri)
    shutil.move(real_pathname, real_filename)


def recursive_delete_files(file_list: list[str]):
    for file_path in file_list:
        real_path = file_path.replace("/output", config.output_uri)

        if os.path.isfile(real_path):
            os.remove(real_path)
        elif os.path.isdir(real_path):
            for root, _, files in os.walk(real_path):
                for file in files:
                    os.remove(os.path.join(root, file))
            os.rmdir(real_path)


from PIL import Image
from io import BytesIO


def get_image_data(filename: str, is_preview: bool):
    try:
        with Image.open(filename) as img:
            original_format = img.format

            if is_preview:
                max_size = 128

                original_width, original_height = img.size
                scale = min(max_size / original_width, max_size / original_height)

                if scale >= 1:
                    new_width, new_height = original_width, original_height
                else:
                    new_width = int(original_width * scale)
                    new_height = int(original_height * scale)

                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            img_byte_arr = BytesIO()
            img.save(img_byte_arr, format=original_format)
            img_byte_arr.seek(0)

            return img_byte_arr
    except Exception as e:
        utils.print_error(str(e))
        return BytesIO()


import zipfile
import datetime


tmp_dir = os.path.join(config.extension_uri, "tmp")


async def package_file(root_dir: str, file_list: list[str]):
    zip_filename = f"{datetime.datetime.now().strftime("%Y%m%dT%H%M%SZ")}.zip"

    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)

    zip_temp_file = os.path.join(tmp_dir, zip_filename)
    real_root_dir = root_dir.replace("/output", config.output_uri)

    utils.print_debug(f"Creating zip file: {zip_temp_file}")
    utils.print_debug(f"Root directory: {root_dir}")
    utils.print_debug(f"Real root directory: {real_root_dir}")

    with zipfile.ZipFile(zip_temp_file, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in file_list:
            real_path = file_path.replace("/output", config.output_uri)
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
