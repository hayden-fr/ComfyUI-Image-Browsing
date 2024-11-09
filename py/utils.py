import os
import configparser
import logging
import requests
import shutil
import tarfile
import yaml
import traceback
from . import config


def print_info(msg, *args, **kwargs):
    logging.info(f"[{config.extension_tag}] {msg}", *args, **kwargs)


def print_error(msg, *args, **kwargs):
    logging.error(f"[{config.extension_tag}] {msg}", *args, **kwargs)
    logging.debug(traceback.format_exc())


def get_current_version():
    try:
        pyproject_path = os.path.join(config.extension_uri, "pyproject.toml")
        config_parser = configparser.ConfigParser()
        config_parser.read(pyproject_path)
        version = config_parser.get("project", "version")
        return version.strip("'\"")
    except:
        return "0.0.0"


def download_web_distribution(version: str):
    web_path = os.path.join(config.extension_uri, "web")
    dev_web_file = os.path.join(web_path, "manager-dev.js")
    if os.path.exists(dev_web_file):
        return

    web_version = "0.0.0"
    version_file = os.path.join(web_path, "version.yaml")
    if os.path.exists(version_file):
        with open(version_file, "r") as f:
            version_content = yaml.safe_load(f)
            web_version = version_content.get("version", web_version)

    if version == web_version:
        return

    try:
        print_info(f"current version {version}, web version {web_version}")
        print_info(f"Downloading web distribution...")
        download_url = f"https://github.com/hayden-fr/ComfyUI-Image-Browsing/releases/download/v{version}/dist.tar.gz"
        response = requests.get(download_url, stream=True)
        response.raise_for_status()

        temp_file = os.path.join(config.extension_uri, "temp.tar.gz")
        with open(temp_file, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        if os.path.exists(web_path):
            shutil.rmtree(web_path)

        print_info(f"Extracting web distribution...")
        with tarfile.open(temp_file, "r:gz") as tar:
            members = [
                member for member in tar.getmembers() if member.name.startswith("web/")
            ]
            tar.extractall(path=config.extension_uri, members=members)

        os.remove(temp_file)
        print_info("Web distribution downloaded successfully.")
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to download web distribution: {e}")
    except tarfile.TarError as e:
        print_error(f"Failed to extract web distribution: {e}")
    except Exception as e:
        print_error(f"An unexpected error occurred: {e}")
