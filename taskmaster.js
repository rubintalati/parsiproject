/**
 * TaskMaster - A simple task management system
 * Helps track tasks, priorities, and progress for the Parsi Project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  tasksFile: path.join(__dirname, 'tasks.json'),
  categoriesFile: path.join(__dirname, 'categories.json'),
  defaultCategories: ['Feature', 'Bug', 'Enhancement', 'Documentation', 'Refactor']
};

// Task status options
const STATUS = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done'
};

// Priority levels
const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

// Ensure files exist
function initializeFiles() {
  // Check if tasks file exists, if not create it
  if (!fs.existsSync(CONFIG.tasksFile)) {
    fs.writeFileSync(CONFIG.tasksFile, JSON.stringify({ tasks: [] }, null, 2));
    console.log('Created tasks file');
  }

  // Check if categories file exists, if not create it
  if (!fs.existsSync(CONFIG.categoriesFile)) {
    fs.writeFileSync(CONFIG.categoriesFile, JSON.stringify({ 
      categories: CONFIG.defaultCategories 
    }, null, 2));
    console.log('Created categories file with default categories');
  }
}

// Load tasks from file
function loadTasks() {
  try {
    const data = fs.readFileSync(CONFIG.tasksFile, 'utf8');
    return JSON.parse(data).tasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    fs.writeFileSync(CONFIG.tasksFile, JSON.stringify({ tasks }, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving tasks:', error);
    return false;
  }
}

// Load categories from file
function loadCategories() {
  try {
    const data = fs.readFileSync(CONFIG.categoriesFile, 'utf8');
    return JSON.parse(data).categories;
  } catch (error) {
    console.error('Error loading categories:', error);
    return CONFIG.defaultCategories;
  }
}

// Save categories to file
function saveCategories(categories) {
  try {
    fs.writeFileSync(CONFIG.categoriesFile, JSON.stringify({ categories }, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving categories:', error);
    return false;
  }
}

// Add a new task
function addTask({ title, description, category, priority, assignee }) {
  const tasks = loadTasks();
  const newTask = {
    id: Date.now().toString(),
    title,
    description,
    category,
    priority: priority || PRIORITY.MEDIUM,
    status: STATUS.TODO,
    assignee: assignee || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  tasks.push(newTask);
  const saved = saveTasks(tasks);
  
  if (saved) {
    console.log(`Task added: "${title}"`);
    return newTask;
  }
  return null;
}

// Update an existing task
function updateTask(id, updates) {
  const tasks = loadTasks();
  const taskIndex = tasks.findIndex(task => task.id === id);
  
  if (taskIndex === -1) {
    console.error(`Task with ID ${id} not found`);
    return null;
  }
  
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  const saved = saveTasks(tasks);
  
  if (saved) {
    console.log(`Task updated: "${tasks[taskIndex].title}"`);
    return tasks[taskIndex];
  }
  return null;
}

// Delete a task
function deleteTask(id) {
  const tasks = loadTasks();
  const filteredTasks = tasks.filter(task => task.id !== id);
  
  if (filteredTasks.length === tasks.length) {
    console.error(`Task with ID ${id} not found`);
    return false;
  }
  
  const saved = saveTasks(filteredTasks);
  
  if (saved) {
    console.log(`Task deleted with ID: ${id}`);
    return true;
  }
  return false;
}

// List all tasks
function listTasks(filters = {}) {
  const tasks = loadTasks();
  
  let filteredTasks = [...tasks];
  
  // Apply filters if they exist
  if (filters.status) {
    filteredTasks = filteredTasks.filter(task => task.status === filters.status);
  }
  
  if (filters.category) {
    filteredTasks = filteredTasks.filter(task => task.category === filters.category);
  }
  
  if (filters.priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
  }
  
  if (filters.assignee) {
    filteredTasks = filteredTasks.filter(task => task.assignee === filters.assignee);
  }
  
  return filteredTasks;
}

// Get task details
function getTask(id) {
  const tasks = loadTasks();
  return tasks.find(task => task.id === id) || null;
}

// Add a new category
function addCategory(categoryName) {
  if (!categoryName) {
    console.error('Category name is required');
    return false;
  }
  
  const categories = loadCategories();
  
  if (categories.includes(categoryName)) {
    console.error(`Category "${categoryName}" already exists`);
    return false;
  }
  
  categories.push(categoryName);
  const saved = saveCategories(categories);
  
  if (saved) {
    console.log(`Category added: "${categoryName}"`);
    return true;
  }
  return false;
}

// Delete a category
function deleteCategory(categoryName) {
  const categories = loadCategories();
  const filteredCategories = categories.filter(cat => cat !== categoryName);
  
  if (filteredCategories.length === categories.length) {
    console.error(`Category "${categoryName}" not found`);
    return false;
  }
  
  const saved = saveCategories(filteredCategories);
  
  if (saved) {
    console.log(`Category deleted: "${categoryName}"`);
    
    // Also update any tasks using this category to have no category
    const tasks = loadTasks();
    const updatedTasks = tasks.map(task => {
      if (task.category === categoryName) {
        return { ...task, category: '', updatedAt: new Date().toISOString() };
      }
      return task;
    });
    
    saveTasks(updatedTasks);
    return true;
  }
  return false;
}

// List all categories
function listCategories() {
  return loadCategories();
}

// Initialize everything
function initialize() {
  console.log('Initializing TaskMaster...');
  initializeFiles();
  console.log('TaskMaster initialized successfully');
}

// Export functions
module.exports = {
  initialize,
  addTask,
  updateTask,
  deleteTask,
  listTasks,
  getTask,
  addCategory,
  deleteCategory,
  listCategories,
  STATUS,
  PRIORITY
};
