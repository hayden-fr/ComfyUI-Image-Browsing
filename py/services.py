import os
import mimetypes

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
