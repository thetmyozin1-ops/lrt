
const SUPABASE_URL = "https://rmlvpvxwctmrppecjeyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_athZmy20q0-0QQ0KLzGy7g_gUV8QBR0";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let allProjects = [];
let selectedCategory = "all";

const $ = (id) => document.getElementById(id);

function safeLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function setSocialLink(id, value) {
  const element = $(id);
  const url = safeLink(value);

  element.hidden = !url;
  if (url) element.href = url;
  else element.removeAttribute("href");
}

async function loadProfile() {
  try {
    const { data, error } = await db
      .from("profile")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Profile not found.");

    $("profile-name").textContent = data.name || "Your Name";
    $("profile-title").textContent = data.title || "";
    $("profile-bio").textContent = data.bio || "";
    $("footer-name").textContent = data.name || "My Portfolio";

    const avatar = $("profile-avatar");
    const avatarUrl = safeLink(data.avatar_url);

    avatar.src = avatarUrl || "https://placehold.co/400x400";
    avatar.onerror = () => {
      avatar.src = "https://placehold.co/400x400";
    };

    setSocialLink("github-link", data.github_link);
    setSocialLink("linkedin-link", data.linkedin_link);
    setSocialLink("contact-github", data.github_link);
    setSocialLink("contact-linkedin", data.linkedin_link);

  } catch (error) {
    console.error("Profile error:", error);
    $("profile-name").textContent = "Profile unavailable";
    $("profile-bio").textContent = "Please try again later.";
  }
}

function getTags(project) {
  if (!project.tags) return [];

  return project.tags
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

async function loadProjects() {
  const grid = $("projects-grid");

  grid.textContent = "Loading projects...";

  try {
    const { data, error } = await db
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allProjects = data || [];

    renderCategories();
    renderProjects();

  } catch (error) {
    console.error("Projects error:", error);
    grid.textContent = "Unable to load projects. Please try again later.";
  }
}

function renderCategories() {
  const container = $("category-filters");
  container.replaceChildren();

  const categories = [
    "all",
    ...new Set(allProjects.flatMap(getTags))
  ];

  categories.forEach(category => {
    const button = document.createElement("button");

    button.className = "filter-btn";
    button.textContent = category === "all" ? "All" : category;
    button.dataset.category = category;

    if (category === selectedCategory) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      selectedCategory = category;
      renderCategories();
      renderProjects();
    });

    container.appendChild(button);
  });
}

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";

  const image = document.createElement("img");
  image.className = "project-image";
  image.alt = project.title || "Project preview";
  image.loading = "lazy";
  image.src = safeLink(project.image_url) ||
    "https://placehold.co/600x400?text=Project";

  image.onerror = () => {
    image.src = "https://placehold.co/600x400?text=Project";
  };

  const content = document.createElement("div");
  content.className = "project-content";

  const heading = document.createElement("h3");
  heading.textContent = project.title || "Untitled Project";

  const description = document.createElement("p");
  description.textContent = project.description || "";

  const tags = document.createElement("div");
  tags.className = "project-tags";

  getTags(project).forEach(tag => {
    const span = document.createElement("span");
    span.textContent = tag;
    tags.appendChild(span);
  });

  content.append(heading, description, tags);

  const url = safeLink(project.project_link);

  if (url) {
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View Project ↗";
    content.appendChild(link);
  }

  card.append(image, content);
  return card;
}

function renderProjects() {
  const grid = $("projects-grid");
  const search = $("project-search").value
    .trim()
    .toLowerCase();

  const filtered = allProjects.filter(project => {
    const tags = getTags(project);

    const matchesCategory =
      selectedCategory === "all" ||
      tags.some(tag => tag === selectedCategory);

    const searchable = [
      project.title,
      project.description,
      project.tags
    ].join(" ").toLowerCase();

    return matchesCategory && searchable.includes(search);
  });

  grid.replaceChildren();

  if (!filtered.length) {
    grid.textContent = "No matching projects found.";
  } else {
    filtered.forEach(project => {
      grid.appendChild(createProjectCard(project));
    });
  }

  $("project-status").textContent =
    `${filtered.length} project${filtered.length === 1 ? "" : "s"} found`;
}

$("project-search").addEventListener("input", renderProjects);

$("current-year").textContent = new Date().getFullYear();

async function initializePortfolio() {
  await Promise.all([
    loadProfile(),
    loadProjects()
  ]);
}

initializePortfolio();
