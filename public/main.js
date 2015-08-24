/*global Promise*/
 /*jshint -W083*/
 /*jshint esnext: true*/
 /*jshint moz: true*/
var todoMain = function (){

    var todoList = document.getElementById("todo-list");
    var todoListPlaceholder = document.getElementById("todo-list-placeholder");
    var form = document.getElementById("todo-form");
    var todoTitle = document.getElementById("new-todo");
    var messagesDiv = document.getElementById("messages");
    var incompleteTodoCount = 0;
    var todosLocal = new Map();
    var currentFilter = document.getElementsByClassName("btn-drop-filter")[0];
    var lastActionID = 0;
    var self = this;
    var nextErrorId = 0;
    var messages = new Map();


    this.filter = function(actionElement) {
        currentFilter = actionElement;
        var type = actionElement.value;
        var buts = document.getElementsByClassName("btn-drop-filter");

        for(var i = 0; i < buts.length; i++) {
            buts[i].className = buts[i].className.replace(" active ", "");
        }
        actionElement.className += " active ";


        for (i = 0; i < todoList.childNodes.length; i++) {
            var li = todoList.childNodes[i];
            var textDiv = document.getElementById(li.getAttribute("for"));
            if ((" " + textDiv.className + " ").indexOf(" completed ") > -1) {
                li.style.display = type === "active" ? "none" : "block";
            } else {
                li.style.display = type === "complete" ? "none" : "block";
            }
        }
    };

    this.deleteCompleted = function() {
        var promises = [];
        for (var todo of todosLocal.values()) {
            if (todo.isComplete) {
                promises.push(new Promise(function(resolve, reject) {deleteTodo(todo.id, resolve);}));
            }
        }
        Promise.all(promises).then(reloadTodoList);
    };

    form.onsubmit = function(event) {
        var title = todoTitle.value;
        createTodo(title);
        todoTitle.value = "";
        event.preventDefault();
    };

    function createTodo(title) {
        function optimisticCreateTodo(response){
            var loc = response.headers.get("location");
            var id = loc.substring(loc.lastIndexOf("/") + 1);
            todosLocal.set(id, {id : id, title : title, isComplete : false});
        }

        fetch("/api/todo", {
            method: "post",
            headers: {"Content-type": "application/json"},
            body: JSON.stringify({title: title}),
        })
        .then(checkStatus)
        .then(optimisticCreateTodo)
        .then(renderList)
        .catch(function(error) {
            renderMessageDialog("error", "Failed to create item. Server returned " +
                    error.status + " - " + error.responseText);
        });
        document.getElementById("scrollToMe").scrollIntoView();
    }
    function performActions(actions) {
        actions.forEach(function(actionOb) {
            switch (actionOb.action) {
                case "create" : todosLocal.set(actionOb.data.id, actionOb.data);
                    break;
                case "update" : todosLocal.set(actionOb.data.id, actionOb.data);
                    break;
                case "delete" : todosLocal.delete(actionOb.data.id);
            }
            lastActionID = actionOb.id > lastActionID ? actionOb.id : lastActionID;
        });
    }

    function mappify(arr) {
        arr.forEach(function(todo) {
            todosLocal.set(todo.id, todo);
        });
    }
    function getTodoList(callback) {
        if (lastActionID > 0) {
            fetch("/api/changes?lastActionID=" + lastActionID, {method: "get"})
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
            lastActionID++;
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

    function updateTodo(element, todoId) {
        var  todo = todosLocal.get(todoId.toString());
        var checked = element.className.indexOf(" active ") < 0 ;
        if(!checked){
            element.className = element.className.replace(" active ", "");
            element.textContent = "#";
        }else{
            element.className += " active ";
            element.textContent = "$";
        }

        function optimisticUpdatTodo(data) {
            todo.isComplete = checked;
            var textElm = document.getElementById(element.getAttribute("for"));
            if (checked) {
                textElm.className += " completed ";
            } else {
                textElm.className = textElm.className.replace(" completed ", "");
            }
        }
        if(todo !== undefined) {
            fetch("/api/todo/" + todo.id, {
                method : "put",
                headers : {"Content-type" : "application/json"},
                body : JSON.stringify({
                    title: todo.title,
                    isComplete: checked
                })
            })
            .then(checkStatus)
            .then(optimisticUpdatTodo)
            .catch(function(error) {
                    renderMessageDialog("error", "Failed to update item " +
                        todoId.toString() + ". Server returned " + error.status + " - " + error.responseText);
            });
        }
    }

    function deleteTodo(todoId, callback) {
        function optimisticDeleteTodo(response){
             todosLocal.delete(todoId.toString());
            renderList();
        }
        if(messages.get(todoId) !== undefined) {
            messages.delete(todoId);
            renderList();
        }else {
            fetch("/api/todo/" + todoId , {method: "delete"})
            .then(checkStatus)
            .then(optimisticDeleteTodo)
            .then(callback)
            .catch(function(error) {
                renderMessageDialog("error", "Failed to delete item " +
                    todoId.toString() + ". Server returned " + error.status + " - " + error.responseText);
                callback();
            });
        }
    }

    function reloadTodoList() {
        getTodoList(renderList);
    }

    function renderList(){
        var todoListBuff = document.createElement("ul");
        todoListBuff.className = "list-group todo-list-group";
        todoListBuff.id  = "todo-list";
        var parent = todoList.parentNode;

        todoListPlaceholder.style.display = "none";
        incompleteTodoCount = 0;
        var i = 0;
        var promises = [];
        for (var todo of todosLocal.values()) {
            promises.push(new Promise(function(resolve, reject) {
                renderTodo(todoListBuff, todo, i, "todo");
                i++;
                resolve();
            }));
        }
        for (var message of messages.values()) {
            promises.push(new Promise(function(resolve, reject) {
                renderTodo(todoListBuff, message, i, message.type);
                i++;
                resolve();
            }));
        }

        Promise.all(promises).then(function() {
            document.getElementById("count-label").textContent = "Total ToDos left to do: " +
                                                                incompleteTodoCount.toString();
            parent.replaceChild(todoListBuff, todoList);
            todoList = todoListBuff;
            self.filter(currentFilter);
        });
    }

    function renderTodo(ul, todo, i, type) {
        var x = String.fromCharCode(160);
        var listItem = document.createElement("li");
        listItem.className = "list-group-item background-coloured";
        listItem.setAttribute("for", "text" + todo.id);

        var row1 = createRow();
        row1.textContent = "# !/bin/" + type + x + todo.id + x + x;
        row1.className = "topRowDecoraction";

        var deleteButton = document.createElement("button");
        deleteButton.id = "deleteTODO" + i;
        deleteButton.onclick = function(){
            deleteTodo(todo.id);
        };
        deleteButton.className  = "deleteButton btn btn-danger btn-small-square";
        // deleteButton.textContent = "X"
        var deleteSpan = document.createElement("span");
        deleteSpan.className = "glyphicon glyphicon-remove wee-x-there";
        deleteButton.appendChild(deleteSpan);

        row1.appendChild(deleteButton);

        listItem.appendChild(row1);

        /*second row of todo*/
        var row2 = createRow();
        row2.className = "display-flex";

        /*second row checkbox*/
        var checkDiv = document.createElement("div");
        checkDiv.className = "checkbox-div";

        var completeBox = document.createElement("button");
        // completeBox.type = "button";
        completeBox.id = "cb" + todo.id;
        completeBox.setAttribute("for", "text" + todo.id);
        completeBox.className = " btn-checkbox";
        completeBox.textContent = "$";
        if(todo.isComplete) {
            completeBox.className += " active ";
            completeBox.textContent = "#";
        }
        completeBox.onclick = function() {
            updateTodo(completeBox, todo.id);
        };

        checkDiv.appendChild(completeBox);

        row2.appendChild(checkDiv);

        /*second row text*/
        var textDiv =document.createElement("div");
        textDiv.className = "flex-grow-2 title-div " + type;
        if (todo.isComplete) {
            textDiv.className += " completed ";
        }else {
            incompleteTodoCount++;
        }
        textDiv.textContent = todo.title;
        textDiv.id = "text" + todo.id;

        row2.appendChild(textDiv);

        listItem.appendChild(row2);

        ul.appendChild(listItem);
    }

    function createRow(){
        var row = document.createElement("div");
        row.className = "row";
        return row;
    }

    function renderMessageDialog(type, message) {
        var todoListBuff = document.createElement("ul");
        var messageOb = {type: type, title : message, id : "error" + nextErrorId ++, isComplete : false};
        messages.set(messageOb.id, messageOb);
        renderTodo(todoList, messageOb,0, type);

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

    function parseJSON(response) {
        return response.json();
    }

    reloadTodoList();
    var timedReload = window.setInterval(reloadTodoList, 1000);
};
todoMain();
