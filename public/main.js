/*global Promise*/
 /*jshint -W083 */
var todoList = document.getElementById("todo-list");
var todoListPlaceholder = document.getElementById("todo-list-placeholder");
var form = document.getElementById("todo-form");
var todoTitle = document.getElementById("new-todo");
var messagesDiv = document.getElementById("messages");
var incompleteTodoCount = 0;
var todosLocal = {};
var currentFilter = "all";
var lastUpdate = 0;

form.onsubmit = function(event) {
    var title = todoTitle.value;
    createTodo(title, function() {
        reloadTodoList();
    });
    todoTitle.value = "";
    event.preventDefault();
};

function createTodo(title, callback) {
    fetch("/api/todo", {
        method: "post",
        headers: {"Content-type": "application/json"},
        body: JSON.stringify({title: title}),
    }).then(checkStatus).then(callback)
    .catch(function(error) {
        renderMessageDialog("error", "Failed to create item. Server returned " +
                error.status + " - " + error.responseText);
    });
}
function performActions(actions) {
    actions.forEach(function(actionOb) {
        switch (actionOb.action) {
            case "create" : todosLocal[actionOb.data.id] = actionOb.data;
                break;
            case "update" : todosLocal[actionOb.data.id] = actionOb.data;
                break;
            case "delete" : delete todosLocal[actionOb.data];
        }
    });
    return todosLocal;
}

function logUpdateTime() {
    lastUpdate = Date.now();
}

function mappify(arr) {
    var map = {};
    arr.forEach(function(todo) {
        map[todo.id] = todo;
    });
    return map;
}
function getTodoList(callback) {
    if (lastUpdate > 0) {
        fetch("/api/changes?since=" + lastUpdate, {method: "get"})
        .then(checkStatus)
        .then(parseJSON)
        .then(performActions)
        .then(callback)
        .then(logUpdateTime)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to get updates. Server returned " +
                this.status + " - " + this.responseText);
        });
    } else {
        fetch("/api/todo/", {method: "get"})
        .then(checkStatus)
        .then(parseJSON)
        .then(mappify)
        .then(callback)
        .then(logUpdateTime)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to get list. Server returned " +
                this.status + " - " + this.responseText);
        });
    }
}

function getTodo(id, callback) {

    fetch("/api/todo/" + id.toString() , {method: "get"})
        .then(checkStatus)
        .then(parseJSON)
        .then(callback)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to get " +
                    id.toString() + ". Server returned " + error.status + " - " + error.responseText);
        });
}

function updateTodo(element, todoId, callback) {
    var  todo = todosLocal[todoId];
    fetch("/api/todo/" + todo.id, {
        method : "put",
        headers : {"Content-type" : "application/json"},
        body : JSON.stringify({
            title: todo.title,
            isComplete: element.checked
        })
    })
    .then(checkStatus)
    .then(function(data) {
        if (element.checked) {
            element.parentNode.className += "completed";
        } else {
            element.parentNode.className = element.parentNode.className.replace("completed", "");
        }
    })
    .then(callback)
    .catch(function(error) {
            renderMessageDialog("error", "Failed to update item " +
                todoId.toString() + ". Server returned " + error.status + " - " + error.responseText);
        });
}

function deleteTodo(todoId, callback) {
    fetch("/api/todo/" + todoId , {method: "delete"})
        .then(checkStatus)
        .then(callback)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to delete item " +
                todoId.toString() + ". Server returned " + error.status + " - " + error.responseText);
        });
}

function deleteCompleted() {
    var promises = [];
    for (var key in todosLocal) {
        var todo = todosLocal[key];
        if (todosLocal[key].isComplete) {
            promises.push(new Promise(function(resolve, reject) {deleteTodo(todo.id, resolve);}));
        }
    }
    Promise.all(promises).then(reloadTodoList);
}

function reloadTodoList() {
    var todoListBuff = document.createElement("ul");
    todoListBuff.id  = "todo-list";
    var parent = todoList.parentNode;
    getTodoList(function(todos) {
        todosLocal = todos;
        todoListPlaceholder.style.display = "none";
        incompleteTodoCount = 0;
        var i = 0;
        var promises = [];
        for (var key in todosLocal) {
            promises.push(new Promise(function(resolve, reject) {
                renderTodo(todoListBuff, todosLocal[key], i);
                i++;
                resolve();
            }));
        }
        Promise.all(promises).then(function() {
            document.getElementById("count-label").textContent = "Total ToDos left to do: " +
                                                                incompleteTodoCount.toString();
            parent.replaceChild(todoListBuff, todoList);
            todoList = todoListBuff;
            filter(currentFilter);
        });
    });
}

function renderTodo(ul, todo, i) {
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
    ul.appendChild(listItem);
}
function renderMessageDialog(type, message) {
    messagesDiv.disabled = false;
    type = type === undefined ? "error" : type;
    var div = document.createElement("div");
    div.className = "dialog " + type;
    div.textContent = message;
    messagesDiv.insertBefore(div, messagesDiv.firstChild);
}

function checkStatus(response) {
    if (response.status >= 200 && response.status < 400) {
        return response;
    } else {
        var error = new Error(response.statusText);
        error.response = response;
        throw error;
    }
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

function parseJSON(response) {
    return response.json();
}

reloadTodoList();
var timedReload = window.setInterval(reloadTodoList, 1000);
