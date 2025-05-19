/**
 * Script to create TaskMaster tasks for death ritual sub-pages
 */

const taskmaster = require('./taskmaster');

// Initialize TaskMaster
taskmaster.initialize();

// Add Web Pages category if it doesn't exist
const categories = taskmaster.listCategories();
if (!categories.includes('Web Pages')) {
    taskmaster.addCategory('Web Pages');
    console.log('Added "Web Pages" category');
}

// Define the tasks based on the death-rituals.html and zoroastrian-death-rituals.md
const tasks = [
    {
        title: 'Create Philosophy & Soul page',
        description: 'Create a sub-page for the Philosophy & Soul section from the zoroastrian-death-rituals.md file. Include content about beliefs on death, the soul, and the afterlife journey. Source sections: 1. The Nature and Philosophy of Death, 2. The Soul and Divine Justice',
        category: 'Web Pages',
        priority: taskmaster.PRIORITY.HIGH,
        assignee: 'Parsi Project Team'
    },
    {
        title: 'Create Major Rituals page',
        description: 'Create a sub-page for the Major Rituals section from the zoroastrian-death-rituals.md file. Include essential steps from Sachkār to Uthamnā and prayers for the soul. Source sections: 4. Overview of Major Death Rituals, including subsections 4.1 through 4.12',
        category: 'Web Pages',
        priority: taskmaster.PRIORITY.HIGH,
        assignee: 'Parsi Project Team'
    },
    {
        title: 'Create Tower of Silence page',
        description: 'Create a sub-page for the Tower of Silence (Dakhma) section from the zoroastrian-death-rituals.md file. Include information about the dakhma system, construction, and ecological wisdom. Source sections: 5. The Dakhma (Tower of Silence): Construction and Consecration, 10. The Dokhmenashini System, 12. The Tower of Silence (Dakhma): Structure, Practice, and Modern Challenges',
        category: 'Web Pages',
        priority: taskmaster.PRIORITY.HIGH,
        assignee: 'Parsi Project Team'
    },
    {
        title: 'Create Etiquette page',
        description: 'Create a sub-page for the Etiquette section from the zoroastrian-death-rituals.md file. Include funeral decorum, rules, and community customs. Source sections: 7. Rules and Decorum at Funerals, 8. Ritual Details and Etiquette',
        category: 'Web Pages',
        priority: taskmaster.PRIORITY.MEDIUM,
        assignee: 'Parsi Project Team'
    },
    {
        title: 'Create Special Rituals page',
        description: 'Create a sub-page for the Special Rituals section from the zoroastrian-death-rituals.md file. Include information about Geh-sārnā, Chinwad Pul, Dokhmenashini, and more. Source sections: 9. Special Rituals and Concepts, 11. The Sagdi at Doongerwadi',
        category: 'Web Pages',
        priority: taskmaster.PRIORITY.MEDIUM,
        assignee: 'Parsi Project Team'
    },
    {
        title: 'Create Modern Challenges page',
        description: 'Create a sub-page for the Modern Challenges section from the zoroastrian-death-rituals.md file. Include contemporary issues, vulture decline, and adaptations. Source section: 12. The Tower of Silence (Dakhma): Structure, Practice, and Modern Challenges (specifically the Modern Usage and Challenges subsection)',
        category: 'Web Pages',
        priority: taskmaster.PRIORITY.MEDIUM,
        assignee: 'Parsi Project Team'
    }
];

// Add each task
tasks.forEach(task => {
    const addedTask = taskmaster.addTask(task);
    if (addedTask) {
        console.log(`Added task: "${task.title}"`);
    } else {
        console.error(`Failed to add task: "${task.title}"`);
    }
});

console.log('\nAll death ritual sub-page tasks have been created successfully!');
console.log('Run "node taskmaster-cli.js" to view and manage these tasks.');
