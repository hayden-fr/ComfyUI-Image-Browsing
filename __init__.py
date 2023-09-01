import server
from aiohttp import web
import os

if not os.path.exists("web/output"):
    os.symlink("../output", "./web/output")


base_uri = os.path.join(os.getcwd(), "output")


@server.PromptServer.instance.routes.get("/image-browsing/list")
async def get_output_files(request):
    uri = request.query.get("uri", "")
    target_uri = os.path.join(base_uri, uri)

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
    target_uri = os.path.join(base_uri, uri)

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


@server.PromptServer.instance.routes.post("/image-browsing/download")
async def download_output_files(request):
    body = await request.json()
    uri = body.get("uri")
    target_uri = os.path.join(base_uri, uri, "")

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

    output_path = os.path.join(base_uri, base_name)
    with zipfile.ZipFile(output_path, "w") as zip:
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

    return web.json_response({"path": base_name})


WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS"]
