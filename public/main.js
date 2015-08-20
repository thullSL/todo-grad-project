/*global Promise*/
 /*jshint -W083*/
 /*jshint esnext: true*/
 /*jshint moz: true*/

var todoList = document.getElementById("todo-list");
var todoListPlaceholder = document.getElementById("todo-list-placeholder");
var form = document.getElementById("todo-form");
var todoTitle = document.getElementById("new-todo");
var messagesDiv = document.getElementById("messages");
var incompleteTodoCount = 0;
var todosLocal = new Map();
var currentFilter = "all";
var lastCommand = 0;

form.onsubmit = function(event) {
    var title = todoTitle.value;
    createTodo(title, function() {
    });
    todoTitle.value = "";
    event.preventDefault();
};

function createTodo(title, callback) {
    var id;
    fetch("/api/todo", {
        method: "post",
        headers: {"Content-type": "application/json"},
        body: JSON.stringify({title: title}),
    }).then(checkStatus).then(function(response) {
        var loc = response.headers.get("location");
        id = loc.substring(loc.lastIndexOf("/") + 1);
        todosLocal.set(id, {id : id, title : title, isComplete : false});
        renderList(todosLocal);
    }).then(callback)
    .catch(function(error) {
        renderMessageDialog("error", "Failed to create item. Server returned " +
                error.status + " - " + error.responseText);
    });
}
function performActions(actions) {
    var todos = todosLocal;
    actions.forEach(function(actionOb) {
        switch (actionOb.action) {
            case "create" : todos.set(actionOb.data.id, actionOb.data);
                break;
            case "update" : todos.set(actionOb.data.id, actionOb.data);
                break;
            case "delete" : todos.delete(actionOb.data);
        }
        lastCommand = actionOb.id > lastCommand? actionOb.id : lastCommand;
    });
    return todosLocal;
}

function mappify(arr) {
    arr.forEach(function(todo) {
        todosLocal.set(todo.id, todo);
    });
    return todosLocal;
}
function getTodoList(callback) {
    if (lastCommand > 0) {
        fetch("/api/changes?lastCommand=" + lastCommand, {method: "get"})
        .then(checkStatus)
        .then(parseJSON)
        .then(performActions)
        .then(callback)
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
        .catch(function(error) {
            renderMessageDialog("error", "Failed to get list. Server returned " +
                this.status + " - " + this.responseText);
        });
        lastCommand ++;
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
    var tds = todosLocal;
    var  todo = todosLocal.get(todoId.toString());
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
        todo.isComplete = element.checked;
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
        .then(function(response) {
            todosLocal.delete(todoId.toString());
            renderList(todosLocal);
        })
        .then(callback)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to delete item " +
                todoId.toString() + ". Server returned " + error.status + " - " + error.responseText);
        });
}

function deleteCompleted() {
    var promises = [];
    for (var todo of todosLocal.values()) {
        if (todo.isComplete) {
            promises.push(new Promise(function(resolve, reject) {deleteTodo(todo.id, resolve);}));
        }
    }
    Promise.all(promises).then(reloadTodoList);
}

function reloadTodoList() {
    getTodoList(renderList);
}

function renderList(todos){
    var todoListBuff = document.createElement("ul");
    todoListBuff.id  = "todo-list";
    var parent = todoList.parentNode;
    todos = todos === undefined? todosLocal : todos;

    todosLocal = todos;
    todoListPlaceholder.style.display = "none";
    incompleteTodoCount = 0;
    var i = 0;
    var promises = [];
    for (var todo of todosLocal.values()) {
        promises.push(new Promise(function(resolve, reject) {
            renderTodo(todoListBuff, todo, i);
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
}

function renderTodo(ul, todo, i) {
    var listItem = document.createElement("li");
    listItem.textContent = todo.title;

    var deleteButton = document.createElement("button");
    deleteButton.id = "deleteTODO" + i;
    deleteButton.setAttribute("onClick", "deleteTodo(" + todo.id + ")");
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
    completeBox.setAttribute("onClick", "updateTodo(this, " + todo.id + ")");

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
