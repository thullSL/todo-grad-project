var todoList = document.getElementById("todo-list");
var todoListPlaceholder = document.getElementById("todo-list-placeholder");
var form = document.getElementById("todo-form");
var todoTitle = document.getElementById("new-todo");
var error = document.getElementById("error");
var todoCount = 0;
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
            error.textContent = "Failed to create item. Server returned " + this.status + " - " + this.responseText;
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
            error.textContent = "Failed to get list. Server returned " + this.status + " - " + this.responseText;
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
            error.textContent = "Failed to get list. Server returned " + this.status + " - " + this.responseText;
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
        todoCount = 0;
        var i = 0;
        todosLocal.forEach(function(todo) {
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
                todoCount++;
            }
            completeBox.className = "isCompleteCheckbox";
            completeBox.setAttribute("onClick", "updateTodo(this, " + todo.id + ", reloadTodoList)");

            listItem.appendChild(deleteButton);
            listItem.appendChild(completeBox);
            todoList.appendChild(listItem);
            i++;
        });
        document.getElementById("count-label").textContent = "Total ToDos left to do: " + todoCount.toString();
    });
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
            error.textContent = "Failed to delete item. Server returned " + this.status + " - " + this.responseText;
        }
    };
}

function deleteTodo(todoId, callback) {
    var deleteRequest = new XMLHttpRequest();
    deleteRequest.open("DELETE", "/api/todo/" + todoId);
    deleteRequest.onload = function() {
        if (this.status === 200) {
            callback();
        } else {
            error.textContent = "Failed to delete item. Server returned " + this.status + " - " + this.responseText;
        }
    };
    deleteRequest.send();
}

reloadTodoList();
