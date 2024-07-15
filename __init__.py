from aiohttp import web
import server
import os
import folder_paths

comfy_ui_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
output_path = folder_paths.get_output_directory()
extension_path = os.path.join(comfy_ui_path, "custom_nodes/ComfyUI-Image-Browsing")


@server.PromptServer.instance.routes.get("/image-browsing/preview")
async def image_preview(request):
    uri = request.query.get("uri")
    filepath = os.path.join(output_path, uri)

    if not os.path.exists(filepath):
        filepath = os.path.join(extension_path, "not-found.png")
    with open(filepath, "rb") as img_file:
        image_data = img_file.read()

    return web.Response(body=image_data, content_type="image/png")


@server.PromptServer.instance.routes.get("/image-browsing/list")
async def get_output_files(request):
    uri = request.query.get("uri", "")
    target_uri = os.path.join(output_path, uri)

    result = []
    if os.path.exists(target_uri):
        file_list = os.listdir(target_uri)

        dir_list = sorted(
            [
                item
                for item in file_list
                if os.path.isdir(os.path.join(target_uri, item))
            ]
        )
        dir_list = map(lambda name: {"type": "dir", "name": name}, dir_list)
        result.extend(dir_list)

        img_list = sorted(
            [item for item in file_list if item.endswith((".png", ".jpg"))]
        )
        img_list = map(lambda name: {"type": "img", "name": name}, img_list)
        result.extend(img_list)

    return web.json_response(result)


@server.PromptServer.instance.routes.delete("/image-browsing/files")
async def delete_output_files(request):
    body = await request.json()
    uri = body.get("uri")
    target_uri = os.path.join(output_path, uri)

    for item in body.get("files", []):
        item_type = item.get("type")
        item_name = item.get("name")
        file_path = os.path.join(target_uri, item_name)

        if os.path.exists(file_path):
            if item_type == "dir":
                os.rmdir(file_path)
            else:
                os.remove(file_path)

    return web.json_response({"success": True})


import zipfile
import datetime


@server.PromptServer.instance.routes.post("/image-browsing/zip")
async def zip_output_files(request):
    body = await request.json()
    uri = body.get("uri")
    target_uri = os.path.join(output_path, uri, "")

    file_list: list[str] = body.get("files", [])
    if len(file_list) == 1:
        base_name = file_list[0].get("name")
        base_name = os.path.basename(base_name)
        base_name = os.path.splitext(base_name)[0]
    else:
        base_name = os.path.dirname(target_uri)
        base_name = os.path.basename(base_name)

    timestamp = datetime.datetime.now()
    base_name = "{}-{}".format(base_name, timestamp.strftime("%Y%m%dT%H%M%SZ"))
    base_name = "{}.zip".format(base_name)

    temp_path = os.path.join(output_path, base_name)
    with zipfile.ZipFile(temp_path, "w") as zip:
        for item in file_list:
            filetype = item.get("type")
            filename = item.get("name")
            filepath = os.path.join(target_uri, filename)
            if not os.path.exists(filepath):
                continue

            zip.write(filepath, filename)
            if filetype == "dir":
                for root, dirs, files in os.walk(filepath):
                    for file in files:
                        _filepath = os.path.join(root, file)
                        _filename = os.path.join(filename, file)
                        zip.write(_filepath, _filename)

    return web.json_response({"type": "zip", "name": base_name})


@server.PromptServer.instance.routes.post("/image-browsing/download")
async def download_zip_file(request):
    body = await request.json()
    filename = body.get("name")
    filepath = os.path.join(output_path, filename)

    with open(filepath, "rb") as file:
        file_data = file.read()

    return web.Response(body=file_data, content_type="application/x-zip-compressed")


WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS"]
