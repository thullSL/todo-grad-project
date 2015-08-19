/*global Promise*/
var todoList = document.getElementById("todo-list");
var todoListPlaceholder = document.getElementById("todo-list-placeholder");
var form = document.getElementById("todo-form");
var todoTitle = document.getElementById("new-todo");
var messagesDiv = document.getElementById("messages");
var incompleteTodoCount = 0;
var todosLocal = [];
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

function getTodoList(callback) {
    fetch("/api/todo/", {method: "get"})
        .then(checkStatus)
        .then(parseJSON)
        .then(callback)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to get list. Server returned " +
                this.status + " - " + this.responseText);
        });
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
    var  todo = findTodo(todoId);
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
    todosLocal.forEach(function(todo) {
        if (todo.isComplete) {
            promises.push(new Promise(function(resolve, reject) {deleteTodo(todo.id, resolve);}));
        }
    });
    Promise.all(promises).then(reloadTodoList);
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
        todosLocal.forEach(function(todo) {
            var listItem = document.createElement("li");
            listItem.textContent = todo.title;

            var deleteButton = document.createElement("button");
            deleteButton.id = "deleteTODO" + i;
            deleteButton.setAttribute("onClick", "deleteTodo(" + todo.id + ", reloadTodoList)");
            deleteButton.textContent = "X";
            deleteButton.className  = "deleteButton button";

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
            i++;
        });
        document.getElementById("count-label").textContent = "Total ToDos left to do: " +
                                                                incompleteTodoCount.toString();
    });
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

function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    } else {
        var error = new Error(response.statusText);
        error.response = response;
        throw error;
    }
}

function parseJSON(response) {
    return response.json();
}

reloadTodoList();
