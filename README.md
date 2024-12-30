# ComfyUI Image Browsing

Browsing Output Images in ComfyUI

<img src="demo/preview.png" style="max-width: 100%; max-height: 300px" >

## Installation

There are three installation methods, choose one

1. Clone the repository: `git clone https://github.com/hayden-fr/ComfyUI-Image-Browsing.git` to your ComfyUI `custom_nodes` folder
2. Download the [latest release](https://github.com/hayden-fr/ComfyUI-Image-Browsing/releases/latest/download/dist.tar.gz) and extract it to your ComfyUI `custom_nodes` folder
3. Use comfy cli: `comfy node registry-install comfyui-image-browsing`

# Features

Click right mouse to open the context menu

- Image files management
  - Upload(explorer context menu -> `Upload file`)
  - Delete(image context menu -> `Delete` or press `Delete` after selected items)
  - Rename(image context menu -> `Rename` or press `F2` after selected items)
  - View(image context menu -> `View` or double click to open)
  - View in new tab(image context menu -> `View in new tab`)
- Folder management
  - Create(explorer context menu -> `Add folder`)
  - Delete(folder context menu -> `Delete` or press `Delete` after selected items)
  - Rename(folder context menu -> `Rename` or press `F2` after selected items)
  - View(folder context menu -> `View` or double click to open)
- Select multiple items(`Ctrl`/`Shift`)
- Download items to local
