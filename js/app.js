import { CONFIG } from "./config.js";

let root, current, selected;
let currentPath = "";

/* ===== RENDER ===== */
function render(folder, path = "") {
  const el = document.getElementById("files");
  el.innerHTML = "";

  current = folder;
  currentPath = path;

  if (folder.parent) {
    const newPath = path.split("/").slice(0, -1).join("/");

    el.appendChild(
      row("../", "", () => render(folder.parent, newPath), CONFIG.icons.back)
    );
  }

  folder.children.forEach(item => {
    let icon = CONFIG.icons.file;

    if (item.type === "folder") icon = CONFIG.icons.folder;
    if (hasExt(item.name, CONFIG.extensions.demo)) icon = CONFIG.icons.demo;

    el.appendChild(
      row(item.name, item.size || "", () => {
        if (item.type === "folder") {
          render(item, joinPath(path, item.name));
        } else {
          copy(joinPath(path, item.name));
        }
      }, icon)
    );
  });
}

/* ===== ROW ===== */
function row(name, size, action, icon) {
  const d = document.createElement("div");
  d.className = "file";

  d.innerHTML = `
    <div class="name">
      <img class="icon" src="${icon}">
      ${name}
    </div>
    <div class="size">${size || ""}</div>
  `;

  d.onclick = () => {
    if (selected) selected.classList.remove("active");
    d.classList.add("active");
    selected = d;
  };

  d.ondblclick = action;

  return d;
}

/* ===== SEARCH ===== */
const searchInput = document.getElementById("search");

searchInput.oninput = e => {
  const q = e.target.value.toLowerCase();
  const el = document.getElementById("files");
  el.innerHTML = "";

  if (!q) {
    render(current, currentPath);
    return;
  }

  flatten(root).forEach(item => {
    if (
      item.type === "file" &&
      hasExt(item.name, CONFIG.search.enabledExtensions) &&
      item.name.toLowerCase().includes(q)
    ) {
      let icon = hasExt(item.name, CONFIG.extensions.demo)
        ? CONFIG.icons.demo
        : CONFIG.icons.file;

      el.appendChild(
        row(item.name, item.size || "", () => {
          copy(item.name);
        }, icon)
      );
    }
  });
};

document.getElementById("clear").onclick = () => {
  searchInput.value = "";
  render(current, currentPath);
};

/* ===== SORT ===== */
let nameAsc = true;
let sizeAsc = true;

document.getElementById("header-name").onclick = () => {
  if (!current || !current.children) return;

  current.children.sort((a, b) =>
    nameAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  nameAsc = !nameAsc;
  render(current, currentPath);
};

document.getElementById("header-size").onclick = () => {
  if (!current || !current.children) return;

  current.children.sort((a, b) => {
    const sa = parseSize(a.size);
    const sb = parseSize(b.size);
    return sizeAsc ? sa - sb : sb - sa;
  });

  sizeAsc = !sizeAsc;
  render(current, currentPath);
};

function parseSize(s) {
  if (!s) return 0;
  let n = parseFloat(s);
  if (s.includes("MB")) return n * 1024;
  if (s.includes("KB")) return n;
  return n;
}

/* ===== HELPERS ===== */
function flatten(node) {
  let arr = [];

  if (node.children) {
    node.children.forEach(c => {
      if (c.type === "file") arr.push(c);
      if (c.children) arr = arr.concat(flatten(c));
    });
  }

  return arr;
}

function hasExt(name, list) {
  return list.some(ext => name.endsWith(ext));
}

function joinPath(path, name) {
  return path ? `${path}/${name}` : name;
}

/* ===== COPY ===== */
function copy(text) {
  navigator.clipboard.writeText(text);

  const t = document.getElementById("toast");
  t.classList.add("show");

  setTimeout(() => t.classList.remove("show"), CONFIG.ui.copyToastTime);
}

/* ===== MUSIC ===== */
const music = document.getElementById("music");
const playBtn = document.getElementById("musicPlay");
const toggle = document.getElementById("musicToggle");
const panel = document.getElementById("musicPanel");
const volume = document.getElementById("volume");

let playing = localStorage.getItem("playing") === "true";
let vol = localStorage.getItem("volume") || 0.5;

music.volume = vol;
volume.value = vol;

toggle.onclick = e => {
  e.stopPropagation();
  panel.classList.toggle("show");
};

document.addEventListener("click", e => {
  if (!panel.contains(e.target) && e.target !== toggle) {
    panel.classList.remove("show");
  }
});

function updateMusicUI() {
  playBtn.src = playing
    ? "assets/images/pause.png"
    : "assets/images/play.png";
}

updateMusicUI();

playBtn.onclick = () => {
  if (music.paused) {
    music.play().catch(() => {});
    playing = true;
  } else {
    music.pause();
    playing = false;
  }

  localStorage.setItem("playing", playing);
  updateMusicUI();
};

volume.oninput = () => {
  music.volume = volume.value;
  localStorage.setItem("volume", volume.value);
};

if (playing) {
  document.addEventListener(
    "click",
    () => {
      if (music.paused) music.play().catch(() => {});
    },
    { once: true }
  );
}

/* ===== LOAD ===== */
function addParents(node, parent = null) {
  node.parent = parent;

  if (node.children) {
    node.children.forEach(c => addParents(c, node));
  }
}

fetch("structure.json")
  .then(r => r.json())
  .then(data => {
    root = data;
    addParents(root);
    render(root);
  });