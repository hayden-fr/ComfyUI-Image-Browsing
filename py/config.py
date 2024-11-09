extension_tag = "ComfyUI Image Browsing"

extension_uri: str = None
output_uri: str = None


from server import PromptServer

serverInstance = PromptServer.instance
routes = serverInstance.routes
