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


@routes.get("/image-browsing/output/{pathname:.*}")
async def scan_output_folder(request):
    pathname = request.match_info.get("pathname", None)
    filename = os.path.join(config.output_uri, pathname)
    if os.path.isfile(filename):

        if not services.asset_is_image(filename):
            return web.Response(status=400)

        is_preview = request.query.get("preview", "false") == "true"

        image_arr = services.get_image_data(filename, is_preview)
        mime_type = services.get_file_mime_type(filename)

        return web.Response(body=image_arr.getvalue(), content_type=mime_type)
    elif os.path.isdir(filename):
        items = services.scan_directory_items(filename)
        return web.json_response({"success": True, "data": items})
    return web.Response(status=404)


WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS"]
