import {
    saveMemory,
    getMemory,
    getAllMemory
} from "./memoryDB.js";


// Save test

saveMemory(
    "name",
    "Shubham"
);


// Read test

const name = getMemory("name");


console.log(
    "User Name:",
    name
);


// Show all memory

console.log(
    getAllMemory()
);