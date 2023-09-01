import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyDialog, $el } from "../../scripts/ui.js";

class ImageBrowsing extends ComfyDialog {
    #task = new Set();
    request(route, options) {
        return new Promise((resolve, reject) => {
            let delay;
            if (this.#task.size === 0) {
                delay = setTimeout(() => {
                    this.loadingMask.style.display = "";
                }, 200);
            }

            const uid = Date.now();
            this.#task.add(uid);

            api.fetchApi(route, options)
                .then((response) => response.json())
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    clearTimeout(delay);

                    setTimeout(() => {
                        this.#task.delete(uid);
                        if (this.#task.size === 0) {
                            this.loadingMask.style.display = "none";
                        }
                    }, 20);
                });
        });
    }

    confirm(options) {
        return new Promise((resolve, reject) => {
            const wrapper = document.createElement("div");
            wrapper.className = "confirm-wrapper";

            const container = $el("div.comfy-modal", [
                $el("div.content", {
                    textContent: options.content,
                }),
                $el("div.footer", [
                    $el("button.cancel", {
                        textContent: "Cancel",
                        onclick: () => {
                            reject();
                            document.body.removeChild(wrapper);
                        },
                    }),
                    $el("button.sure", {
                        textContent: "Sure",
                        onclick: () => {
                            resolve();
                            document.body.removeChild(wrapper);
                        },
                    }),
                ]),
            ]);

            wrapper.appendChild(container);
            document.body.appendChild(wrapper);
        });
    }

    constructor() {
        super();

        // image grid list
        const gridContainer = $el("div.grid-container", [
            $el("div.grid-content"),
        ]);
        /** @type {HTMLDivElement} */
        this.gridContainer = gridContainer;

        // image base info
        const informationContainer = $el("div.information");
        this.informationContainer = informationContainer;

        // left operate buttons panel
        const operatePanel = $el("div.operate-panel-container", [
            $el("button.refresh", {
                type: "button",
                textContent: "Refresh",
                onclick: () => this.refreshImageList(),
            }),
            $el("button.download", {
                type: "button",
                textContent: "Download",
                onclick: () => {
                    let fileName;
                    this.request("/image-browsing/download", {
                        method: "POST",
                        body: JSON.stringify({
                            uri: this.breadCrumbs.join("/"),
                            files: this.selectedItems,
                        }),
                    })
                        .then(({ path }) => {
                            fileName = path;
                            return fetch(`/output/${fileName}`);
                        })
                        .then((response) => response.blob())
                        .then((blob) => {
                            const a = document.createElement("a");
                            const url = URL.createObjectURL(blob);
                            a.href = url;
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                        })
                        .then(() => {
                            this.request("/image-browsing/files", {
                                method: "DELETE",
                                body: JSON.stringify({
                                    uri: "",
                                    files: [{ type: "file", name: fileName }],
                                }),
                            });
                        })
                        .catch((error) => {
                            console.error("文件下载失败", error);
                        });
                },
            }),
            $el("button.delete", {
                type: "button",
                textContent: "Delete",
                onclick: async () => {
                    await this.confirm({
                        content: "Delete selected items?",
                    });
                    await this.request("/image-browsing/files", {
                        method: "DELETE",
                        body: JSON.stringify({
                            uri: this.breadCrumbs.join("/"),
                            files: this.selectedItems,
                        }),
                    });
                    this.selectedItems = [];
                    await this.refreshImageList();
                },
            }),
            informationContainer,
            $el("button.close", {
                type: "button",
                textContent: "Close",
                onclick: () => this.close(),
            }),
        ]);
        this.operatePanel = operatePanel;

        // image preview
        const previewContainer = $el(
            "div.preview-container",
            {
                style: { display: "none" },
            },
            [
                $el("button.close", {
                    textContent: "X",
                    onclick: () => {
                        this.previewContainer.style.display = "none";
                        this.gridContainer.style.overflowY = "";
                        document.removeEventListener(
                            "keyup",
                            this.keyboardController
                        );
                    },
                }),
                $el("button.prev", {
                    textContent: "<",
                    onclick: () => this.prevImageItem(),
                }),
                $el("div.preview-img"),
                $el("button.next", {
                    textContent: ">",
                    onclick: () => this.nextImageItem(),
                }),
            ]
        );
        this.previewContainer = previewContainer;

        // loading mask
        const loadingMask = $el("div.loading-container", {}, [
            $el(
                "div.content",
                Array.from({ length: 8 }, (_, index) => {
                    const rotate = `${45 * index}deg`;
                    const transform = `rotate(${rotate}) translateY(-15px)`;
                    return $el("div.item", {
                        style: { transform },
                    });
                })
            ),
        ]);
        this.loadingMask = loadingMask;

        this.element = $el(
            "div.comfy-modal.image-browsing-container",
            { parent: document.body },
            [
                $el("link", {
                    rel: "stylesheet",
                    href: "./extensions/ComfyUI-Image-Browsing/image-browsing.css",
                }),
                $el("div.comfy-modal-content.image-browsing-content", [
                    gridContainer,
                    operatePanel,
                    previewContainer,
                    loadingMask,
                ]),
            ]
        );

        this.refreshImageList();
    }

    /** @type {Array<string>} */
    breadCrumbs = [];
    /** @type {Array<ItemType>} */
    contentList = [];
    /** @type {Array<ImageItem>} */
    imageList = [];

    async refreshImageList() {
        const uri = this.breadCrumbs.join("/");
        const resData = await this.request(`/image-browsing/list?uri=${uri}`);
        this.contentList = resData;
        this.updateGridContent(resData);
    }

    /**
     * @typedef ImageItem
     * @prop {string} imgUrl
     * @prop {number} index
     */

    /**
     * @typedef ItemType
     * @prop {string} type
     * @prop {string} name
     */

    /**
     * @param {Array<ItemType>} dataSource
     */
    updateGridContent(dataSource) {
        const gridContent = this.gridContainer.querySelector(".grid-content");
        gridContent.innerHTML = null;

        if (this.breadCrumbs.length > 0) {
            // generate parent dir
            const parentFolderName = "..";
            gridContent.append(
                $el(
                    "div.grid-item",
                    {
                        ondblclick: () => {
                            this.breadCrumbs.pop();
                            this.refreshImageList();
                            this.selectedItems = [];
                        },
                    },
                    [
                        $el("div.folder"),
                        $el("p.name", { textContent: parentFolderName }),
                    ]
                )
            );
        }

        const imageList = [];
        const baseUrl = this.breadCrumbs.join("/");

        dataSource.forEach((item) => {
            if (item.type === "dir") {
                gridContent.append(
                    $el(
                        "div.grid-item",
                        {
                            onclick: this.selectItem.bind(this, item),
                            ondblclick: () => {
                                this.breadCrumbs.push(item.name);
                                this.refreshImageList();
                                this.selectedItems = [];
                            },
                        },
                        [
                            $el("div.folder"),
                            $el("p.name", {
                                title: item.name,
                                textContent: item.name,
                            }),
                        ]
                    )
                );
            }

            if (item.type === "img") {
                const imgUrl = ["output", baseUrl, item.name].join("/");
                const index = imageList.length;
                const imageItem = { imgUrl, index };
                imageList.push(imageItem);

                gridContent.append(
                    $el(
                        "div.grid-item",
                        {
                            onclick: this.selectItem.bind(this, item),
                            ondblclick: () => {
                                this.previewImageItem = imageItem;
                                this.showImagePreview();
                            },
                        },
                        [
                            $el("div.img", [$el("img", { src: imgUrl })]),
                            $el("p.name", {
                                title: item.name,
                                textContent: item.name,
                            }),
                        ]
                    )
                );
            }
        });

        this.imageList = imageList;
    }

    /** @type {Array<ItemType>} */
    selectedItems = [];

    /**
     * Change selected item
     *
     * @param {ItemType} item
     * @param {Event} event
     */
    selectItem(item, event) {
        event.stopPropagation();

        /**
         * @param {ItemType} current
         * @param {boolean} status
         */
        const highlight = (current, status) => {
            const currentItem = this.gridContainer.querySelector(
                `.grid-content div.grid-item:has(p[title="${current.name}"])`
            );
            if (status) {
                currentItem.classList.add("selected");
            } else {
                currentItem.classList.remove("selected");
            }
        };

        if (event.shiftKey) {
            const startItem = this.selectedItems.shift();
            if (startItem) {
                // unset other selected item highlight
                this.selectedItems.forEach((item) => {
                    highlight(item, false);
                });
                this.selectedItems = [startItem];

                // resolve selected range
                const contentList = this.contentList;
                const asc = (a, b) => a - b;
                const [startIndex, endIndex] = [
                    contentList.findIndex((o) => o.name === startItem.name),
                    contentList.findIndex((o) => o.name === item.name),
                ].sort(asc);
                this.selectedItems.push(
                    ...contentList
                        .slice(startIndex, endIndex + 1)
                        .filter((o) => o.name !== startItem.name)
                );
                this.selectedItems.forEach((item) => {
                    highlight(item, true);
                });
            } else {
                this.selectedItems = [item];
                highlight(item, true);
            }
        }
        // multi select
        else if (event.ctrlKey) {
            const selectedItems = this.selectedItems.map((item) => item.name);
            if (selectedItems.includes(item.name)) {
                const index = selectedItems.indexOf(item.name);
                this.selectedItems.splice(index, 1);
                // remove el active
                highlight(item, false);
            } else {
                this.selectedItems.push(item);
                // add el active
                highlight(item, true);
            }
        } else {
            // remove old item active
            this.selectedItems.forEach((item) => {
                highlight(item, false);
            });
            this.selectedItems = [item];
            // add new item active
            highlight(item, true);
        }
    }

    showImagePreview() {
        const imageItem = this.previewImageItem;
        this.previewContainer.style.display = "";
        this.gridContainer.style.overflowY = "hidden";
        const content = this.previewContainer.querySelector(".preview-img");
        content.innerHTML = `<img src="${imageItem.imgUrl}" />`;
        // listen arrow key to change preview image
        const arrowKeyboardController = (event) => {
            switch (event.code) {
                case "ArrowRight":
                    this.nextImageItem();
                    break;
                case "ArrowLeft":
                    this.prevImageItem();
                    break;
                default:
                    break;
            }
        };
        if (!this.listenArrowKeyBoard) {
            this.__arrowKeyboardController = arrowKeyboardController;
            document.addEventListener("keyup", this.__arrowKeyboardController);
            this.listenArrowKeyBoard = true;
        }
    }

    closeImagePreview() {
        this.previewContainer.style.display = "none";
        this.gridContainer.style.overflowY = "";
        this.previewImageItem = null;
        this.listenArrowKeyBoard = false;
        document.removeEventListener("keyup", this.__arrowKeyboardController);
        this.__arrowKeyboardController = null;
    }

    prevImageItem() {
        const index = this.previewImageItem.index - 1;
        this.previewImageItem =
            index < 0
                ? this.imageList[this.imageList.length - 1]
                : this.imageList[index];
        this.showImagePreview(this.previewImageItem);
    }

    nextImageItem() {
        const index = this.previewImageItem.index + 1;
        this.previewImageItem =
            index >= this.imageList.length
                ? this.imageList[0]
                : this.imageList[index];
        this.showImagePreview(this.previewImageItem);
    }
}

let instance;

const getInstance = () => {
    if (!instance) {
        instance = new ImageBrowsing();
    }
    return instance;
};

app.registerExtension({
    name: "Comfy.ImageBrowsing",

    async setup() {
        const menu = document.querySelector(".comfy-menu");

        const button = document.createElement("button");
        button.textContent = "Output";
        button.id = "comfy-image-browsing";
        button.onclick = () => {
            const instance = getInstance();
            instance.show();
        };
        menu.append(button);
    },
});
