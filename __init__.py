import os
import folder_paths
from .py import config


config.extension_uri = os.path.dirname(__file__)
config.output_uri = folder_paths.get_output_directory()


from .py import utils

version = utils.get_current_version()
utils.download_web_distribution(version)


from aiohttp import web
from .py import services


routes = config.routes


@routes.get("/image-browsing/output{pathname:.*}")
async def scan_output_folder(request):
    try:
        pathname = request.match_info.get("pathname", None)
        pathname = utils.get_output_pathname(pathname)
        filepath = utils.get_real_output_filepath(pathname)

        if os.path.isfile(filepath):

            preview_type = request.query.get("preview", None)
            if not preview_type:
                return web.FileResponse(filepath)

            if services.assert_file_type(filepath, ["image"]):
                image_data = services.get_image_data(filepath)
                return web.Response(body=image_data.getvalue(), content_type="image/webp")

        elif os.path.isdir(filepath):
            items = services.scan_directory_items(filepath)
            return web.json_response({"success": True, "data": items})

        return web.Response(status=404)
    except Exception as e:
        error_msg = f"Obtain failed: {str(e)}"
        utils.print_error(error_msg)
        return web.json_response({"success": False, "error": error_msg})


@routes.post("/image-browsing/output{pathname:.*}")
async def create_file_or_folder(request):
    try:
        pathname = request.match_info.get("pathname", None)
        pathname = utils.get_output_pathname(pathname)
        reader = await request.multipart()
        await services.create_file_or_folder(pathname, reader)
        return web.json_response({"success": True})
    except Exception as e:
        error_msg = f"Create failed: {str(e)}"
        utils.print_error(error_msg)
        return web.json_response({"success": False, "error": error_msg})


@routes.put("/image-browsing/output{pathname:.*}")
async def update_output_file(request):
    try:
        pathname = request.match_info.get("pathname", None)
        pathname = utils.get_output_pathname(pathname)
        data = await request.json()
        filename = data.get("filename", None)
        services.rename_file(pathname, filename)
        return web.json_response({"success": True})
    except Exception as e:
        error_msg = f"Update failed: {str(e)}"
        utils.print_error(error_msg)
        return web.json_response({"success": False, "error": error_msg})


@routes.delete("/image-browsing/delete")
async def delete_files(request):
    try:
        data = await request.json()
        file_list = data.get("file_list", [])
        services.recursive_delete_files(file_list)
        return web.json_response({"success": True})
    except Exception as e:
        error_msg = f"Delete failed: {str(e)}"
        utils.print_error(error_msg)
        return web.json_response({"success": False, "error": error_msg})


@routes.post("/image-browsing/archive")
async def archive_specific_files(request):
    try:
        data = await request.json()
        file_list = data.get("file_list", [])
        if not file_list or len(file_list) == 0:
            return web.json_response({"success": False, "error": "No files provided"}, status=400)

        root_dir = data.get("uri", "/output/")
        zip_filename = await services.package_file(root_dir, file_list)
        return web.json_response({"success": True, "data": zip_filename})
    except Exception as e:
        error_msg = f"Archive failed: {str(e)}"
        utils.print_error(error_msg)
        return web.json_response({"success": False, "error": error_msg})


@routes.get("/image-browsing/archive/{tmp_name}")
async def download_tmp_file(request):
    try:
        tmp_name = request.match_info.get("tmp_name", None)
        if not tmp_name:
            return web.Response(status=404)

        temp_file_path = await services.get_temp_file_path(tmp_name)
        if not os.path.isfile(temp_file_path):
            return web.Response(status=404)

        async with services.open_tmp_file(temp_file_path) as f:
            response = web.StreamResponse()
            response.headers["Content-Disposition"] = f'attachment; filename="{tmp_name}"'
            response.headers["Content-Type"] = "application/x-zip-compressed"

            await response.prepare(request)

            chunk_size = 256 * 1024

            while True:
                chunk = await f.read(chunk_size)
                if not chunk:
                    break
                await response.write(chunk)
            await response.write_eof()
            return response
    except Exception as e:
        error_msg = f"Read archive failed: {str(e)}"
        utils.print_error(error_msg)
        return web.json_response({"success": False, "error": error_msg})


WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS"]
