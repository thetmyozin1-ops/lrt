
const SUPABASE_URL = "https://rmlvpvxwctmrppecjeyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_athZmy20q0-0QQ0KLzGy7g_gUV8QBR0";

// Replace with your Supabase Authentication user UUID.
const ADMIN_USER_ID = "277aebeb-cfab-4d29-a18b-c90688fdda6e";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

function showMessage(id, message, type = "success") {
  const element = $(id);
  element.textContent = message;
  element.className = `message ${type}`;
}

function clearMessage(id) {
  $(id).textContent = "";
  $(id).className = "";
}

function setLoading(buttonId, loading, originalText) {
  const button = $(buttonId);
  button.disabled = loading;
  button.textContent = loading ? "Please wait..." : originalText;
}

function validOptionalUrl(value) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

// Verify that the logged-in user is the designated administrator.
async function checkAdmin() {
  const { data, error } = await db.auth.getUser();

  if (error || !data.user) {
    showLogin();
    return false;
  }

  if (
    !ADMIN_USER_ID ||
    ADMIN_USER_ID.includes("PASTE_") ||
    data.user.id !== ADMIN_USER_ID
  ) {
    await db.auth.signOut();
    showLogin();
    showMessage(
      "login-message",
      "Access denied. This account is not an authorized administrator.",
      "error"
    );
    return false;
  }

  $("login-section").classList.add("hidden");
  $("dashboard-section").classList.remove("hidden");

  await Promise.all([
    loadAdminProfile(),
    loadAdminProjects()
  ]);

  return true;
}

function showLogin() {
  $("login-section").classList.remove("hidden");
  $("dashboard-section").classList.add("hidden");
}

// Login
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();

  clearMessage("login-message");
  setLoading("login-button", true, "Sign In");

  try {
    const email = $("login-email").value.trim();
    const password = $("login-password").value;

    const { error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const authorized = await checkAdmin();

    if (!authorized) return;

    showMessage(
      "login-message",
      "Successfully logged in."
    );

  } catch (error) {
    showMessage(
      "login-message",
      error.message || "Login failed.",
      "error"
    );
  } finally {
    setLoading("login-button", false, "Sign In");
  }
});

// Load existing profile
async function loadAdminProfile() {
  try {
    const { data, error } = await db
      .from("profile")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) throw error;

    $("edit-name").value = data.name || "";
    $("edit-title").value = data.title || "";
    $("edit-bio").value = data.bio || "";
    $("edit-avatar").value = data.avatar_url || "";
    $("edit-github").value = data.github_link || "";
    $("edit-linkedin").value = data.linkedin_link || "";

  } catch (error) {
    showMessage(
      "profile-message",
      "Unable to load profile: " + error.message,
      "error"
    );
  }
}

// Update profile
$("profile-form").addEventListener("submit", async event => {
  event.preventDefault();

  clearMessage("profile-message");

  const buttonId = "profile-button";
  setLoading(buttonId, true, "Update Profile");

  try {
    const avatar = $("edit-avatar").value.trim();
    const github = $("edit-github").value.trim();
    const linkedin = $("edit-linkedin").value.trim();

    if (
      !validOptionalUrl(avatar) ||
      !validOptionalUrl(github) ||
      !validOptionalUrl(linkedin)
    ) {
      throw new Error("Please enter valid HTTP or HTTPS URLs.");
    }

    const profile = {
      name: $("edit-name").value.trim(),
      title: $("edit-title").value.trim(),
      bio: $("edit-bio").value.trim(),
      avatar_url: avatar,
      github_link: github,
      linkedin_link: linkedin
    };

    if (!profile.name) {
      throw new Error("Name is required.");
    }

    const { data, error } = await db
      .from("profile")
      .update(profile)
      .eq("id", 1)
      .select();

    if (error) throw error;

    if (!data || !data.length) {
      throw new Error("Profile was not updated.");
    }

    showMessage(
      "profile-message",
      "Profile updated successfully!"
    );

  } catch (error) {
    showMessage(
      "profile-message",
      error.message || "Profile update failed.",
      "error"
    );
  } finally {
    setLoading(buttonId, false, "Update Profile");
  }
});

// Add project
$("project-form").addEventListener("submit", async event => {
  event.preventDefault();

  clearMessage("project-message");

  const buttonId = "project-button";
  setLoading(buttonId, true, "+ Add Project");

  try {
    const image = $("project-image").value.trim();
    const link = $("project-link").value.trim();

    if (
      !validOptionalUrl(image) ||
      !validOptionalUrl(link)
    ) {
      throw new Error("Please enter valid HTTP or HTTPS URLs.");
    }

    const project = {
      title: $("project-title").value.trim(),
      description: $("project-description").value.trim(),
      image_url: image,
      project_link: link,
      tags: $("project-tags").value.trim()
    };

    if (!project.title || !project.description) {
      throw new Error("Project title and description are required.");
    }

    const { error } = await db
      .from("projects")
      .insert([project]);

    if (error) throw error;

    $("project-form").reset();

    showMessage(
      "project-message",
      "Project added successfully!"
    );

    await loadAdminProjects();

  } catch (error) {
    showMessage(
      "project-message",
      error.message || "Unable to add project.",
      "error"
    );
  } finally {
    setLoading(buttonId, false, "+ Add Project");
  }
});

// Load projects in admin dashboard
async function loadAdminProjects() {
  const container = $("admin-project-list");

  container.textContent = "Loading projects...";

  try {
    const { data, error } = await db
      .from("projects")
      .select("id, title, tags, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.textContent = "No projects available.";
      return;
    }

    data.forEach(project => {
      const item = document.createElement("div");
      item.className = "project-admin-item";

      const info = document.createElement("div");

      const title = document.createElement("strong");
      title.textContent = project.title;

      const tags = document.createElement("p");
      tags.textContent = project.tags || "No categories";

      info.append(title, tags);

      const button = document.createElement("button");
      button.className = "admin-button delete-button";
      button.textContent = "Delete";
      button.type = "button";
      button.setAttribute(
        "aria-label",
        `Delete ${project.title}`
      );

      button.addEventListener("click", () => {
        deleteProject(project.id, button);
      });

      item.append(info, button);
      container.appendChild(item);
    });

  } catch (error) {
    container.textContent =
      "Unable to load projects: " + error.message;
  }
}

// Delete project
async function deleteProject(id, button) {
  if (!confirm("Are you sure you want to delete this project?")) {
    return;
  }

  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    const { data, error } = await db
      .from("projects")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("Project could not be deleted.");
    }

    showMessage(
      "project-message",
      "Project deleted successfully!"
    );

    await loadAdminProjects();

  } catch (error) {
    showMessage(
      "project-message",
      error.message || "Delete failed.",
      "error"
    );

    button.disabled = false;
    button.textContent = "Delete";
  }
}

// Logout
$("logout-button").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Logout failed: " + error.message);
    return;
  }

  showLogin();
  $("login-form").reset();
  $("dashboard-section").classList.add("hidden");
});

// Check existing session when dashboard opens
checkAdmin();

// React to session changes
db.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    showLogin();
  }
});
