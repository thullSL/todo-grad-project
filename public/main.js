/*global Promise*/
var todoList = document.getElementById("todo-list");
var todoListPlaceholder = document.getElementById("todo-list-placeholder");
var form = document.getElementById("todo-form");
var todoTitle = document.getElementById("new-todo");
var messagesDiv = document.getElementById("messages");
var incompleteTodoCount = 0;
var todosLocal = [];
var currentFilter = "all";
form.onsubmit = function(event) {
    var title = todoTitle.value;
    createTodo(title, function() {
        reloadTodoList();
    });
    todoTitle.value = "";
    event.preventDefault();
};

function createTodo(title, callback) {
    var createRequest = new XMLHttpRequest();
    createRequest.open("POST", "/api/todo");
    createRequest.setRequestHeader("Content-type", "application/json");
    createRequest.send(JSON.stringify({
        title: title
    }));
    createRequest.onload = function() {
        if (this.status === 201) {
            callback();
        } else {
            renderMessageDialog("error", "Failed to create item. Server returned " +
                this.status + " - " + this.responseText);
        }
    };
}

function getTodoList(callback) {
    var createRequest = new XMLHttpRequest();
    createRequest.open("GET", "/api/todo");
    createRequest.onload = function() {
        if (this.status === 200) {
            callback(JSON.parse(this.responseText));
        } else {
            renderMessageDialog("error", "Failed to get list. Server returned " +
                this.status + " - " + this.responseText);
        }
    };
    createRequest.send();
}

function getTodo(id, callback) {
    var createRequest = new XMLHttpRequest();
    createRequest.open("GET", "/api/todo/" + id);
    createRequest.onload = function() {
        if (this.status === 200) {
            callback(JSON.parse(this.responseText));
        } else {
            renderMessageDialog("error", "Failed to get " +
                id.toString() + ". Server returned " + this.status + " - " + this.responseText);
        }
    };
    createRequest.send();
}

function reloadTodoList() {
    while (todoList.firstChild) {
        todoList.removeChild(todoList.firstChild);
    }
    todoListPlaceholder.style.display = "block";
    getTodoList(function(todos) {
        todosLocal = todos;
        todoListPlaceholder.style.display = "none";
        incompleteTodoCount = 0;
        var i = 0;
        var promises = [];
        todosLocal.forEach(function(todo) {
            promises.push(new Promise(function(resolve, reject) {
                renderTodo(todo, i);
                i++;
                resolve();
            }));
        });
        Promise.all(promises).then(function() {
            document.getElementById("count-label").textContent = "Total ToDos left to do: " +
                                                                incompleteTodoCount.toString();
            filter(currentFilter);
        });
    });
}

function renderTodo(todo, i) {
    var listItem = document.createElement("li");
    listItem.textContent = todo.title;

    var deleteButton = document.createElement("button");
    deleteButton.id = "deleteTODO" + i;
    deleteButton.setAttribute("onClick", "deleteTodo(" + todo.id + ", reloadTodoList)");
    deleteButton.textContent = "X";
    deleteButton.className  = "deleteButton";

    var completeBox = document.createElement("input");
    completeBox.type = "checkbox";
    completeBox.checked = todo.isComplete;
    if (todo.isComplete) {
        listItem.className += "completed";
    }else {
        incompleteTodoCount++;
    }
    completeBox.className = "isCompleteCheckbox";
    completeBox.setAttribute("onClick", "updateTodo(this, " + todo.id + ", reloadTodoList)");

    listItem.appendChild(deleteButton);
    listItem.appendChild(completeBox);
    todoList.appendChild(listItem);
}
function renderMessageDialog(message, type) {
    messagesDiv.disabled = false;
    type = type === undefined ? "error" : type;
    var div = document.createElement("div");
    div.className = "dialog " + type;
    div.textContent = message;
    messagesDiv.insertBefore(div, messagesDiv.firstChild);
}

function findTodo(id) {
    for (var i in todosLocal) {
        if (todosLocal[i].id === id.toString()) {
            return todosLocal[i];
        }
    }
}

function updateTodo(element, todoId, callback) {
    var updateRequest = new XMLHttpRequest();
    var  todo = findTodo(todoId);
    updateRequest.open("PUT", "/api/todo/" + todo.id);
    updateRequest.setRequestHeader("Content-type", "application/json");
    var d = element.checked;
    updateRequest.send(JSON.stringify({
        title: todo.title,
        isComplete: element.checked
    }));
    updateRequest.onload = function() {
        if (this.status === 200) {
            if (element.checked) {
                element.parentNode.className += "completed";
            } else {
                element.parentNode.className = element.parentNode.className.replace("completed", "");
            }
            callback();
        } else {
            renderMessageDialog("error", "Failed to update item " +
                todoId.toString() + ". Server returned " + this.status + " - " + this.responseText);
        }
    };
}

function deleteTodo(todoId, callback) {
    var deleteRequest = new XMLHttpRequest();
    deleteRequest.open("DELETE", "/api/todo/" + todoId);
    deleteRequest.onload = function() {
        if (this.status === 200) {
        } else {
            renderMessageDialog("error", "Failed to delete item " +
                todoId.toString() + ". Server returned " + this.status + " - " + this.responseText);
        }
        callback(this.status);
    };
    deleteRequest.send();
}
function filter(type) {
    currentFilter = type;
    for (var i = 0; i < todoList.childNodes.length; i++) {
        var li = todoList.childNodes[i];
        if ((" " + li.className + " ").indexOf(" completed ") > -1) {
            li.style.display = type === "active" ? "none" : "list-item";
        } else {
            li.style.display = type === "complete" ? "none" : "list-item";
        }
    }
}

function deleteCompleted() {
    var promises = [];
    todosLocal.forEach(function(todo) {
        if (todo.isComplete) {
            promises.push(new Promise(function(resolve, reject) {deleteTodo(todo.id, resolve);}));
        }
    });
    Promise.all(promises).then(reloadTodoList);
}

reloadTodoList();
