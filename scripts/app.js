const sectionManifest = [
  { id: "summary", file: "./sections/summary.html" },
  { id: "experience", file: "./sections/experience.html" },
  { id: "projects", file: "./sections/projects.html" },
  { id: "education", file: "./sections/education.html" },
  { id: "achievements", file: "./sections/achievements.html" }
];

const projectHashToCollapse = {
  "#project-mm-api": "collapse-mm-api",
  "#project-mm-backoffice": "collapse-mm-backoffice",
  "#project-mm-web": "collapse-mm-web",
  "#project-ffxi-atlas": "collapse-ffxi",
  "#project-eegviewer": "collapse-eegviewer"
};

const themeStorageKey = "webcv-theme";
let mermaidInitialized = false;

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-toggle-icon");
  const label = document.getElementById("theme-toggle-label");
  if (icon) {
    icon.className = `fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`;
  }
  if (label) {
    label.textContent = `Theme: ${theme === "dark" ? "Dark" : "Light"}`;
  }
}

function initThemeToggle() {
  const toggleButton = document.getElementById("theme-toggle");
  const savedTheme = localStorage.getItem(themeStorageKey);
  const initialTheme = savedTheme || getSystemTheme();
  applyTheme(initialTheme);

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      localStorage.setItem(themeStorageKey, nextTheme);
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const explicitlySet = localStorage.getItem(themeStorageKey);
    if (!explicitlySet) {
      applyTheme(getSystemTheme());
    }
  });
}

async function loadSections() {
  const root = document.getElementById("content-root");
  root.innerHTML = "";

  for (const item of sectionManifest) {
    const response = await fetch(item.file);
    if (!response.ok) {
      throw new Error(`Failed to load ${item.file}`);
    }

    const section = document.createElement("section");
    section.id = item.id;
    section.className = "content-section";
    section.innerHTML = await response.text();
    root.appendChild(section);
  }
}

function activateSidebarLinks() {
  const links = [...document.querySelectorAll(".sidebar-link")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const href = `#${entry.target.id}`;
        links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === href));
        toggleProjectsSubnav(href === "#projects");
      });
    },
    { rootMargin: "-40% 0px -45% 0px", threshold: 0.01 }
  );

  sectionManifest.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el) observer.observe(el);
  });
}

function initMermaid() {
  if (!window.mermaid) return;
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
    mermaidInitialized = true;
  }
}

async function renderMermaid(scope = document) {
  if (!window.mermaid) return;
  initMermaid();
  const nodes = [...scope.querySelectorAll(".mermaid:not([data-rendered='true'])")];
  for (const node of nodes) {
    const source = node.textContent.trim();
    if (!source) continue;
    const diagramId = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const { svg, bindFunctions } = await mermaid.render(diagramId, source);
      node.innerHTML = svg;
      node.dataset.rendered = "true";
      if (typeof bindFunctions === "function") bindFunctions(node);
    } catch (error) {
      node.dataset.rendered = "error";
      node.innerHTML = `<pre class="diagram-error">Diagram unavailable.</pre>`;
    }
  }
}

function openProjectFromHash() {
  const collapseId = projectHashToCollapse[window.location.hash];
  if (!collapseId || !window.bootstrap) return;
  const collapseEl = document.getElementById(collapseId);
  if (!collapseEl) return;
  bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false }).show();
}

function toggleProjectsSubnav(expanded) {
  const group = document.getElementById("projects-link-group");
  if (!group) return;
  group.classList.toggle("expanded", expanded);
}

function updateProjectSublinkState() {
  const links = [...document.querySelectorAll(".sidebar-sublink")];
  let hasActiveProject = false;
  links.forEach((link) => {
    const isActive = link.getAttribute("href") === window.location.hash;
    link.classList.toggle("active", isActive);
    if (isActive) hasActiveProject = true;
  });
  const projectSectionActive = !!document.querySelector('.sidebar-link[href="#projects"]')?.classList.contains("active");
  toggleProjectsSubnav(hasActiveProject || projectSectionActive || window.location.hash === "#projects");
}

async function boot() {
  try {
    initThemeToggle();
    await loadSections();
    activateSidebarLinks();
    openProjectFromHash();
    updateProjectSublinkState();
    await renderMermaid();
    document.getElementById("projects-link")?.addEventListener("click", () => {
      toggleProjectsSubnav(true);
    });
    document.addEventListener("shown.bs.collapse", (event) => {
      if (event.target.classList.contains("accordion-collapse")) {
        renderMermaid(event.target);
      }
    });
    window.addEventListener("hashchange", () => {
      openProjectFromHash();
      updateProjectSublinkState();
    });
    document.getElementById("year").textContent = new Date().getFullYear();
  } catch (error) {
    document.getElementById("content-root").innerHTML =
      `<section class="content-section"><h2 class="h5">Could not load content</h2><p>${error.message}</p></section>`;
  }
}

boot();
