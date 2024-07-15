import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyDialog, $el } from "../../scripts/ui.js";

function request(route, options) {
    return new Promise((resolve, reject) => {
        api.fetchApi(route, options)
            .then((response) => response.json())
            .then(resolve)
            .catch(reject);
    });
}

class Grid {
    /**
     * @typedef ItemType
     * @prop {'dir' | 'img'} type
     * @prop {string} name
     * @prop {string} [imgUrl]
     */

    /**
     * @typedef GridProps
     * @prop {function} [onLoading]
     * @prop {function} [onPreview]
     */

    /** @type {GridProps} */
    #props = {};

    /**
     * @param {GridProps} props
     */
    constructor(props) {
        /** @type {HTMLDivElement} */
        this.element = $el("div.grid");
        this.#props = props ?? {};
    }

    /**
     * directory level paths
     * @type {string[]}
     */
    #breadCrumbs = [];

    /**
     * all items
     * @type {ItemType[]}
     */
    #dataSource = [];

    /**
     * selected items
     * @type {ItemType[]}
     */
    #selectedItems = [];

    #parsePath(file) {
        return [...this.#breadCrumbs, file].filter(Boolean).join("/");
    }

    async refresh() {
        this.#props.onLoading?.(true);
        const uri = this.#parsePath();
        return request(`/image-browsing/list?uri=${uri}`)
            .then((/** @type {ItemType[]} */ resData) => {
                this.#dataSource = resData.map((item) => {
                    if (item.type === "img") {
                        const uri = this.#parsePath(item.name);
                        const imgUrl = `/image-browsing/preview?uri=${uri}`;
                        item.imgUrl = imgUrl;
                    }
                    return item;
                });
                this.#updateDom();
            })
            .finally(() => {
                this.#props.onLoading?.(false);
            });
    }

    /**
     * all dom of items
     * @type {HTMLDivElement[]}
     */
    #itemDomList = [];

    #updateDom() {
        this.element.innerHTML = null;

        /**
         * @param {ItemType} item
         */
        const $folder = (item, attr = {}) => {
            return $el("div.grid-item", attr, [
                $el("div.folder"),
                $el("p.name", [item.name]),
            ]);
        };

        /**
         * @param {ItemType} item
         */
        const $image = (item, attr) => {
            return $el("div.grid-item", attr, [
                $el("div.image", [$el("img", { src: item.imgUrl })]),
                $el("p.name", [item.name]),
            ]);
        };

        const imageList = [];
        const items = this.#dataSource.map((item) => {
            if (item.type === "dir") {
                return $folder(item, {
                    onclick: this.#toggleSelect.bind(this, item),
                    ondblclick: (e) => {
                        e.stopPropagation();
                        this.#breadCrumbs.push(item.name);
                        this.refresh();
                    },
                });
            }
            imageList.push(item);
            return $image(item, {
                onclick: this.#toggleSelect.bind(this, item),
                ondblclick: () => this.#props.onPreview?.(item, imageList),
            });
        });
        if (this.#breadCrumbs.length > 0) {
            const parentItem = { type: "dir", name: ".." };
            items.unshift(
                $folder(parentItem, {
                    ondblclick: (e) => {
                        e.stopPropagation();
                        this.#breadCrumbs.pop();
                        this.refresh();
                    },
                })
            );
        }
        this.#itemDomList = items;
        this.element.append.apply(this.element, items);
    }

    /**
     * @param {ItemType} item
     * @param {Event} event
     */
    #toggleSelect(item, event) {
        event.stopPropagation();

        if (event.shiftKey) {
            if (this.#selectedItems.length === 0) {
                this.#selectedItems = [item];
            } else {
                const start = this.#selectedItems.shift();

                const [begin, end] = [
                    this.#dataSource.findIndex((o) => o.name === start.name),
                    this.#dataSource.findIndex((o) => o.name === item.name),
                ].sort((a, b) => a - b);

                const range = this.#dataSource.slice(begin, end + 1);
                this.#selectedItems = [
                    start,
                    ...range.filter((o) => o.name !== start.name),
                ];
            }
        } else if (event.ctrlKey) {
            if (this.#selectedItems.some((o) => o.name === item.name)) {
                this.#selectedItems = this.#selectedItems.filter(
                    (o) => o.name !== item.name
                );
            } else {
                this.#selectedItems.push(item);
            }
        } else {
            this.#selectedItems = [item];
        }

        const selectedKeys = this.#selectedItems.map((o) => o.name);

        this.#itemDomList.forEach((el) => {
            const name = el.innerText;
            if (selectedKeys.includes(name)) {
                el.classList.add("selected");
            } else {
                el.classList.remove("selected");
            }
        });
    }

    getSelected() {
        return this.#selectedItems;
    }

    getDirname() {
        return this.#parsePath();
    }

    cleanSelected() {
        this.#selectedItems = [];
    }
}

class Preview {
    constructor() {
        /** @type {HTMLDivElement} */
        this.element = $el("div.preview-container", [
            $el("button.close", {
                textContent: "X",
                onclick: () => this.close(),
            }),
            $el("button.prev", {
                type: "button",
                textContent: "<",
                style: { order: -1 },
                onclick: () => this.#prevImage(),
            }),
            $el("button.next", {
                type: "button",
                textContent: ">",
                style: { order: 1 },
                onclick: () => this.#nextImage(),
            }),
            $el("div.preview-img"),
        ]);
        this.element.style.display = "none";

        this.#listenShortKey = (event) => {
            switch (event.code) {
                case "ArrowRight":
                    this.#nextImage();
                    break;
                case "ArrowLeft":
                    this.#prevImage();
                    break;
                default:
                    break;
            }
        };
    }

    #listenShortKey;

    /** @type {ItemType[]} */
    #imageList = [];

    /** @type {number} */
    #current;

    #nextImage() {
        const next = this.#current + 1;
        this.#current = next >= this.#imageList.length ? 0 : next;
        this.#updateImage();
    }

    #prevImage() {
        const next = this.#current - 1;
        this.#current = next < 0 ? this.#imageList.length - 1 : next;
        this.#updateImage();
    }

    /**
     * @param {ItemType} item
     * @param {ItemType[]} list
     */
    show(item, list) {
        this.#imageList = list;
        this.#current = list.findIndex((o) => o.name === item.name);
        this.element.style.display = "";
        this.#updateImage();
        document.addEventListener("keyup", this.#listenShortKey);
    }

    /**
     * @param {ItemType} item
     */
    #updateImage() {
        const item = this.#imageList[this.#current];
        const preview = this.element.querySelector(".preview-img");
        preview.innerHTML = `<img src="${item.imgUrl}" />`;
    }

    close() {
        this.element.style.display = "none";
        document.removeEventListener("keyup", this.#listenShortKey);
    }
}

class Loading {
    constructor() {
        /** @type {HTMLDivElement} */
        this.element = $el("div.loading-container", [
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
    }

    toggle(status) {
        if (status) {
            this.element.style.display = "";
        } else {
            this.element.style.display = "none";
        }
    }
}

class ImageBrowsing extends ComfyDialog {
    #confirm(options) {
        return new Promise((resolve, reject) => {
            const confirm = { value: null };

            $el(
                "div.confirm-mask",
                { parent: this.element, $: (el) => (confirm.value = el) },
                [
                    $el("div.comfy-modal", [
                        $el("div.content", {
                            textContent: options.content,
                        }),
                        $el("div.footer", [
                            $el("button.cancel", {
                                textContent: "Cancel",
                                onclick: () => {
                                    reject();
                                    this.element.removeChild(confirm.value);
                                },
                            }),
                            $el("button.sure", {
                                textContent: "Sure",
                                onclick: () => {
                                    resolve();
                                    this.element.removeChild(confirm.value);
                                },
                            }),
                        ]),
                    ]),
                ]
            );
        });
    }

    #loading;
    #preview;
    #grid;

    constructor() {
        super();

        this.#loading = new Loading();
        this.#preview = new Preview();
        this.#grid = new Grid({
            onLoading: this.#loading.toggle.bind(this.#loading),
            onPreview: this.#preview.show.bind(this.#preview),
        });

        this.element = $el(
            "div.comfy-modal.image-browsing",
            { parent: document.body },
            [
                $el("div.comfy-modal-content", [
                    this.#createToolbar(),
                    $el("div.grid-container", [this.#grid.element]),
                    this.#preview.element,
                    this.#loading.element,
                ]),
            ]
        );
    }

    #createToolbar() {
        return $el("div.row.toolbar", [
            $el("button.refresh", {
                type: "button",
                textContent: "Refresh",
                onclick: () => this.#grid.refresh(),
            }),
            $el("button.download", {
                type: "button",
                textContent: "Download",
                onclick: () => this.#downloadSelectItems(),
            }),
            $el("button.delete", {
                type: "button",
                textContent: "Delete",
                onclick: () => this.#deleteSelectItems(),
            }),
            $el("button.close", {
                type: "button",
                textContent: "X",
                style: { marginLeft: "auto" },
                onclick: () => this.close(),
            }),
        ]);
    }

    #downloadSelectItems() {
        const uri = this.#grid.getDirname();
        const files = this.#grid.getSelected();
        if (files.length === 0) {
            return;
        }

        this.#loading.toggle(true);

        const file = { value: null };
        request("/image-browsing/zip", {
            method: "POST",
            body: JSON.stringify({ uri, files }),
        })
            .then((fileInfo) => {
                file.value = fileInfo;
                return fetch("/image-browsing/download", {
                    method: "POST",
                    body: JSON.stringify(fileInfo),
                });
            })
            .then((response) => response.blob())
            .then((blob) => {
                const downloadUrl = URL.createObjectURL(blob);
                const download = $el("a", {
                    href: downloadUrl,
                    download: file.value?.name,
                });
                download.click();
                URL.revokeObjectURL(downloadUrl);
            })
            .then(() => {
                return request("/image-browsing/files", {
                    method: "DELETE",
                    body: JSON.stringify({ uri: "", files: [file.value] }),
                });
            })
            .finally(() => {
                this.#loading.toggle(false);
            });
    }

    #deleteSelectItems() {
        const uri = this.#grid.getDirname();
        const files = this.#grid.getSelected();
        if (files.length === 0) {
            return;
        }

        this.#loading.toggle(true);

        this.#confirm({
            content: "Confirm delete selected items?",
        })
            .then(() =>
                request("/image-browsing/files", {
                    method: "DELETE",
                    body: JSON.stringify({ uri, files }),
                })
            )
            .then(() => this.#grid.refresh())
            .finally(() => {
                this.#loading.toggle(false);
            });
    }

    show() {
        super.show();
        this.#grid.refresh();
    }
}

let instance;

/**
 * @returns {ImageBrowsing}
 */
const getInstance = () => {
    if (!instance) {
        instance = new ImageBrowsing();
    }
    return instance;
};

app.registerExtension({
    name: "Comfy.ImageBrowsing",

    async setup() {
        $el("link", {
            parent: document.head,
            rel: "stylesheet",
            href: "./extensions/ComfyUI-Image-Browsing/image-browsing.css",
        });

        app.ui.menuContainer.appendChild(
            $el("button", {
                id: "comfyui-image-browsing-button",
                textContent: "Output",
                onclick: () => {
                    getInstance().show();
                },
            })
        );

        // [Beta] Adapt to new menu style
        const createImageIcon = (el) => {
            const ns = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", "0 0 1024 1024");
            svg.setAttribute("width", "1em");
            svg.setAttribute("height", "1em");
            svg.style.fontSize = 19;
            const customPath = document.createElementNS(ns, "path");
            const drawPath =
                "M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zM338 304c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z m513.9 437.1c-1.4 1.2-3.3 1.9-5.2 1.9H177.2c-4.4 0-8-3.6-8-8 0-1.9 0.7-3.7 1.9-5.2l170.3-202c2.8-3.4 7.9-3.8 11.3-1 0.3 0.3 0.7 0.6 1 1l99.4 118 158.1-187.5c2.8-3.4 7.9-3.8 11.3-1 0.3 0.3 0.7 0.6 1 1l229.6 271.6c2.6 3.3 2.2 8.4-1.2 11.2z";
            customPath.setAttribute("d", drawPath);
            customPath.setAttribute("fill", "currentColor");
            svg.appendChild(customPath);
            el.appendChild(svg);
        };

        $el(
            "div.comfyui-button-group",
            { parent: document.querySelector("section.comfyui-menu-push") },
            $el("button.comfyui-button", {
                title: "View Output Images",
                $: createImageIcon,
                onclick: () => {
                    getInstance().show();
                },
            })
        );
    },
});
