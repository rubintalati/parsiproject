#!/usr/bin/env node

/**
 * TaskMaster CLI
 * Command-line interface for the TaskMaster task management system
 */

const readline = require('readline');
const taskmaster = require('./taskmaster');

// Initialize TaskMaster
taskmaster.initialize();

// Create interface for command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main menu
function showMainMenu() {
  console.log('\n========== TaskMaster ==========');
  console.log('1. View Tasks');
  console.log('2. Add Task');
  console.log('3. Update Task');
  console.log('4. Delete Task');
  console.log('5. Manage Categories');
  console.log('6. Exit');
  console.log('================================\n');
  
  rl.question('Select an option (1-6): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        viewTasksMenu();
        break;
      case '2':
        addTaskPrompt();
        break;
      case '3':
        updateTaskPrompt();
        break;
      case '4':
        deleteTaskPrompt();
        break;
      case '5':
        manageCategoriesMenu();
        break;
      case '6':
        console.log('Goodbye!');
        rl.close();
        break;
      default:
        console.log('Invalid option. Please try again.');
        showMainMenu();
    }
  });
}

// View tasks menu
function viewTasksMenu() {
  console.log('\n========== View Tasks ==========');
  console.log('1. View All Tasks');
  console.log('2. View Tasks by Status');
  console.log('3. View Tasks by Category');
  console.log('4. View Tasks by Priority');
  console.log('5. Back to Main Menu');
  console.log('================================\n');
  
  rl.question('Select an option (1-5): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        displayTasks(taskmaster.listTasks());
        break;
      case '2':
        viewTasksByStatusPrompt();
        break;
      case '3':
        viewTasksByCategoryPrompt();
        break;
      case '4':
        viewTasksByPriorityPrompt();
        break;
      case '5':
        showMainMenu();
        break;
      default:
        console.log('Invalid option. Please try again.');
        viewTasksMenu();
    }
  });
}

// Display tasks
function displayTasks(tasks) {
  console.log('\n========== Tasks List ==========');
  
  if (tasks.length === 0) {
    console.log('No tasks found.');
  } else {
    tasks.forEach((task, index) => {
      console.log(`\n--- Task #${index + 1} ---`);
      console.log(`ID: ${task.id}`);
      console.log(`Title: ${task.title}`);
      console.log(`Description: ${task.description}`);
      console.log(`Category: ${task.category || 'None'}`);
      console.log(`Status: ${task.status}`);
      console.log(`Priority: ${task.priority}`);
      console.log(`Assignee: ${task.assignee || 'Unassigned'}`);
      console.log(`Created: ${new Date(task.createdAt).toLocaleString()}`);
      console.log(`Updated: ${new Date(task.updatedAt).toLocaleString()}`);
    });
  }
  
  rl.question('\nPress Enter to continue...', () => {
    viewTasksMenu();
  });
}

// View tasks by status
function viewTasksByStatusPrompt() {
  console.log('\nAvailable Status Options:');
  console.log(`1. ${taskmaster.STATUS.TODO}`);
  console.log(`2. ${taskmaster.STATUS.IN_PROGRESS}`);
  console.log(`3. ${taskmaster.STATUS.REVIEW}`);
  console.log(`4. ${taskmaster.STATUS.DONE}`);
  
  rl.question('Select status (1-4): ', (answer) => {
    let status;
    switch (answer.trim()) {
      case '1':
        status = taskmaster.STATUS.TODO;
        break;
      case '2':
        status = taskmaster.STATUS.IN_PROGRESS;
        break;
      case '3':
        status = taskmaster.STATUS.REVIEW;
        break;
      case '4':
        status = taskmaster.STATUS.DONE;
        break;
      default:
        console.log('Invalid option. Please try again.');
        viewTasksByStatusPrompt();
        return;
    }
    
    displayTasks(taskmaster.listTasks({ status }));
  });
}

// View tasks by category
function viewTasksByCategoryPrompt() {
  const categories = taskmaster.listCategories();
  
  console.log('\nAvailable Categories:');
  categories.forEach((category, index) => {
    console.log(`${index + 1}. ${category}`);
  });
  
  rl.question(`Select category (1-${categories.length}): `, (answer) => {
    const index = parseInt(answer.trim()) - 1;
    if (index >= 0 && index < categories.length) {
      displayTasks(taskmaster.listTasks({ category: categories[index] }));
    } else {
      console.log('Invalid option. Please try again.');
      viewTasksByCategoryPrompt();
    }
  });
}

// View tasks by priority
function viewTasksByPriorityPrompt() {
  console.log('\nAvailable Priority Options:');
  console.log(`1. ${taskmaster.PRIORITY.LOW}`);
  console.log(`2. ${taskmaster.PRIORITY.MEDIUM}`);
  console.log(`3. ${taskmaster.PRIORITY.HIGH}`);
  console.log(`4. ${taskmaster.PRIORITY.CRITICAL}`);
  
  rl.question('Select priority (1-4): ', (answer) => {
    let priority;
    switch (answer.trim()) {
      case '1':
        priority = taskmaster.PRIORITY.LOW;
        break;
      case '2':
        priority = taskmaster.PRIORITY.MEDIUM;
        break;
      case '3':
        priority = taskmaster.PRIORITY.HIGH;
        break;
      case '4':
        priority = taskmaster.PRIORITY.CRITICAL;
        break;
      default:
        console.log('Invalid option. Please try again.');
        viewTasksByPriorityPrompt();
        return;
    }
    
    displayTasks(taskmaster.listTasks({ priority }));
  });
}

// Add task prompt
function addTaskPrompt() {
  console.log('\n========== Add New Task ==========');
  
  rl.question('Title: ', (title) => {
    if (!title) {
      console.log('Title is required.');
      addTaskPrompt();
      return;
    }
    
    rl.question('Description: ', (description) => {
      const categories = taskmaster.listCategories();
      
      console.log('\nAvailable Categories:');
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category}`);
      });
      
      rl.question(`Select category (1-${categories.length}): `, (categoryAnswer) => {
        const categoryIndex = parseInt(categoryAnswer.trim()) - 1;
        let category = '';
        
        if (categoryIndex >= 0 && categoryIndex < categories.length) {
          category = categories[categoryIndex];
        }
        
        console.log('\nPriority Options:');
        console.log(`1. ${taskmaster.PRIORITY.LOW}`);
        console.log(`2. ${taskmaster.PRIORITY.MEDIUM}`);
        console.log(`3. ${taskmaster.PRIORITY.HIGH}`);
        console.log(`4. ${taskmaster.PRIORITY.CRITICAL}`);
        
        rl.question('Select priority (1-4): ', (priorityAnswer) => {
          let priority;
          switch (priorityAnswer.trim()) {
            case '1':
              priority = taskmaster.PRIORITY.LOW;
              break;
            case '2':
              priority = taskmaster.PRIORITY.MEDIUM;
              break;
            case '3':
              priority = taskmaster.PRIORITY.HIGH;
              break;
            case '4':
              priority = taskmaster.PRIORITY.CRITICAL;
              break;
            default:
              priority = taskmaster.PRIORITY.MEDIUM;
          }
          
          rl.question('Assignee (leave empty if unassigned): ', (assignee) => {
            const newTask = taskmaster.addTask({
              title,
              description,
              category,
              priority,
              assignee
            });
            
            if (newTask) {
              console.log('\nTask added successfully!');
            }
            
            rl.question('\nPress Enter to continue...', () => {
              showMainMenu();
            });
          });
        });
      });
    });
  });
}

// Update task prompt
function updateTaskPrompt() {
  const tasks = taskmaster.listTasks();
  
  console.log('\n========== Update Task ==========');
  
  if (tasks.length === 0) {
    console.log('No tasks available to update.');
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
    return;
  }
  
  console.log('\nAvailable Tasks:');
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. [${task.status}] ${task.title}`);
  });
  
  rl.question(`Select task to update (1-${tasks.length}): `, (taskAnswer) => {
    const taskIndex = parseInt(taskAnswer.trim()) - 1;
    
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      
      console.log('\nUpdate Task Fields:');
      console.log('1. Title');
      console.log('2. Description');
      console.log('3. Category');
      console.log('4. Status');
      console.log('5. Priority');
      console.log('6. Assignee');
      
      rl.question('Select field to update (1-6): ', (fieldAnswer) => {
        switch (fieldAnswer.trim()) {
          case '1':
            updateTaskTitle(task);
            break;
          case '2':
            updateTaskDescription(task);
            break;
          case '3':
            updateTaskCategory(task);
            break;
          case '4':
            updateTaskStatus(task);
            break;
          case '5':
            updateTaskPriority(task);
            break;
          case '6':
            updateTaskAssignee(task);
            break;
          default:
            console.log('Invalid option. Please try again.');
            updateTaskPrompt();
        }
      });
    } else {
      console.log('Invalid task selection. Please try again.');
      updateTaskPrompt();
    }
  });
}

// Update task title
function updateTaskTitle(task) {
  rl.question(`New title (current: ${task.title}): `, (title) => {
    if (!title) {
      console.log('Title cannot be empty.');
      updateTaskTitle(task);
      return;
    }
    
    const updatedTask = taskmaster.updateTask(task.id, { title });
    
    if (updatedTask) {
      console.log('\nTask title updated successfully!');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
  });
}

// Update task description
function updateTaskDescription(task) {
  rl.question(`New description (current: ${task.description}): `, (description) => {
    const updatedTask = taskmaster.updateTask(task.id, { description });
    
    if (updatedTask) {
      console.log('\nTask description updated successfully!');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
  });
}

// Update task category
function updateTaskCategory(task) {
  const categories = taskmaster.listCategories();
  
  console.log('\nAvailable Categories:');
  categories.forEach((category, index) => {
    console.log(`${index + 1}. ${category}`);
  });
  
  rl.question(`Select new category (1-${categories.length}): `, (categoryAnswer) => {
    const categoryIndex = parseInt(categoryAnswer.trim()) - 1;
    
    if (categoryIndex >= 0 && categoryIndex < categories.length) {
      const category = categories[categoryIndex];
      const updatedTask = taskmaster.updateTask(task.id, { category });
      
      if (updatedTask) {
        console.log('\nTask category updated successfully!');
      }
    } else {
      console.log('Invalid category selection. Please try again.');
      updateTaskCategory(task);
      return;
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
  });
}

// Update task status
function updateTaskStatus(task) {
  console.log('\nAvailable Status Options:');
  console.log(`1. ${taskmaster.STATUS.TODO}`);
  console.log(`2. ${taskmaster.STATUS.IN_PROGRESS}`);
  console.log(`3. ${taskmaster.STATUS.REVIEW}`);
  console.log(`4. ${taskmaster.STATUS.DONE}`);
  
  rl.question('Select new status (1-4): ', (answer) => {
    let status;
    switch (answer.trim()) {
      case '1':
        status = taskmaster.STATUS.TODO;
        break;
      case '2':
        status = taskmaster.STATUS.IN_PROGRESS;
        break;
      case '3':
        status = taskmaster.STATUS.REVIEW;
        break;
      case '4':
        status = taskmaster.STATUS.DONE;
        break;
      default:
        console.log('Invalid option. Please try again.');
        updateTaskStatus(task);
        return;
    }
    
    const updatedTask = taskmaster.updateTask(task.id, { status });
    
    if (updatedTask) {
      console.log('\nTask status updated successfully!');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
  });
}

// Update task priority
function updateTaskPriority(task) {
  console.log('\nPriority Options:');
  console.log(`1. ${taskmaster.PRIORITY.LOW}`);
  console.log(`2. ${taskmaster.PRIORITY.MEDIUM}`);
  console.log(`3. ${taskmaster.PRIORITY.HIGH}`);
  console.log(`4. ${taskmaster.PRIORITY.CRITICAL}`);
  
  rl.question('Select new priority (1-4): ', (answer) => {
    let priority;
    switch (answer.trim()) {
      case '1':
        priority = taskmaster.PRIORITY.LOW;
        break;
      case '2':
        priority = taskmaster.PRIORITY.MEDIUM;
        break;
      case '3':
        priority = taskmaster.PRIORITY.HIGH;
        break;
      case '4':
        priority = taskmaster.PRIORITY.CRITICAL;
        break;
      default:
        console.log('Invalid option. Please try again.');
        updateTaskPriority(task);
        return;
    }
    
    const updatedTask = taskmaster.updateTask(task.id, { priority });
    
    if (updatedTask) {
      console.log('\nTask priority updated successfully!');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
  });
}

// Update task assignee
function updateTaskAssignee(task) {
  rl.question(`New assignee (current: ${task.assignee || 'Unassigned'}): `, (assignee) => {
    const updatedTask = taskmaster.updateTask(task.id, { assignee });
    
    if (updatedTask) {
      console.log('\nTask assignee updated successfully!');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
  });
}

// Delete task prompt
function deleteTaskPrompt() {
  const tasks = taskmaster.listTasks();
  
  console.log('\n========== Delete Task ==========');
  
  if (tasks.length === 0) {
    console.log('No tasks available to delete.');
    rl.question('\nPress Enter to continue...', () => {
      showMainMenu();
    });
    return;
  }
  
  console.log('\nAvailable Tasks:');
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. [${task.status}] ${task.title}`);
  });
  
  rl.question(`Select task to delete (1-${tasks.length}): `, (taskAnswer) => {
    const taskIndex = parseInt(taskAnswer.trim()) - 1;
    
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      
      rl.question(`Are you sure you want to delete "${task.title}"? (y/n): `, (confirmAnswer) => {
        if (confirmAnswer.trim().toLowerCase() === 'y') {
          const deleted = taskmaster.deleteTask(task.id);
          
          if (deleted) {
            console.log('\nTask deleted successfully!');
          }
        } else {
          console.log('\nDeletion cancelled.');
        }
        
        rl.question('\nPress Enter to continue...', () => {
          showMainMenu();
        });
      });
    } else {
      console.log('Invalid task selection. Please try again.');
      deleteTaskPrompt();
    }
  });
}

// Manage categories menu
function manageCategoriesMenu() {
  console.log('\n========== Manage Categories ==========');
  console.log('1. View All Categories');
  console.log('2. Add Category');
  console.log('3. Delete Category');
  console.log('4. Back to Main Menu');
  console.log('======================================\n');
  
  rl.question('Select an option (1-4): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        displayCategories();
        break;
      case '2':
        addCategoryPrompt();
        break;
      case '3':
        deleteCategoryPrompt();
        break;
      case '4':
        showMainMenu();
        break;
      default:
        console.log('Invalid option. Please try again.');
        manageCategoriesMenu();
    }
  });
}

// Display categories
function displayCategories() {
  const categories = taskmaster.listCategories();
  
  console.log('\n========== Categories List ==========');
  
  if (categories.length === 0) {
    console.log('No categories found.');
  } else {
    categories.forEach((category, index) => {
      console.log(`${index + 1}. ${category}`);
    });
  }
  
  rl.question('\nPress Enter to continue...', () => {
    manageCategoriesMenu();
  });
}

// Add category prompt
function addCategoryPrompt() {
  console.log('\n========== Add New Category ==========');
  
  rl.question('Category name: ', (categoryName) => {
    if (!categoryName) {
      console.log('Category name is required.');
      addCategoryPrompt();
      return;
    }
    
    const added = taskmaster.addCategory(categoryName);
    
    if (added) {
      console.log('\nCategory added successfully!');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      manageCategoriesMenu();
    });
  });
}

// Delete category prompt
function deleteCategoryPrompt() {
  const categories = taskmaster.listCategories();
  
  console.log('\n========== Delete Category ==========');
  
  if (categories.length === 0) {
    console.log('No categories available to delete.');
    rl.question('\nPress Enter to continue...', () => {
      manageCategoriesMenu();
    });
    return;
  }
  
  console.log('\nAvailable Categories:');
  categories.forEach((category, index) => {
    console.log(`${index + 1}. ${category}`);
  });
  
  rl.question(`Select category to delete (1-${categories.length}): `, (categoryAnswer) => {
    const categoryIndex = parseInt(categoryAnswer.trim()) - 1;
    
    if (categoryIndex >= 0 && categoryIndex < categories.length) {
      const category = categories[categoryIndex];
      
      rl.question(`Are you sure you want to delete "${category}"? (y/n): `, (confirmAnswer) => {
        if (confirmAnswer.trim().toLowerCase() === 'y') {
          const deleted = taskmaster.deleteCategory(category);
          
          if (deleted) {
            console.log('\nCategory deleted successfully!');
          }
        } else {
          console.log('\nDeletion cancelled.');
        }
        
        rl.question('\nPress Enter to continue...', () => {
          manageCategoriesMenu();
        });
      });
    } else {
      console.log('Invalid category selection. Please try again.');
      deleteCategoryPrompt();
    }
  });
}

// Start the CLI
console.log('Welcome to TaskMaster CLI!');
showMainMenu();
