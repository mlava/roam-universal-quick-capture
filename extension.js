const config = {
    tabTitle: "Universal Quick Capture",
    settings: [
        {
            id: "uqcrr-token",
            name: "Todoist API Token",
            description: "Your API token from https://todoist.com/app/settings/integrations",
            action: { type: "input", placeholder: "Add Todoist API token here" },
        },
        {
            id: "uqcrr-account",
            name: "Todoist Account Type",
            description: "Free or Premium",
            action: { type: "input", placeholder: "Free" },
        },
        {
            id: "uqcrr-inbox-id",
            name: "Todoist Inbox ID",
            description: "Your Todoist inbox id",
            action: { type: "input", placeholder: "Add inbox id here" },
        },
        {
            id: "uqcrr-import-tag",
            name: "Roam Research Tag",
            description: "Set this tag in Roam Research on import",
            action: { type: "input", placeholder: "Quick Capture" },
        },
        {
            id: "uqcrr-import-header",
            name: "Roam Research Header",
            description: "Text Header for Roam Research on import",
            action: { type: "input", placeholder: "Imported Quick Capture items" },
        },
        {
            id: "uqcrr-label-mode",
            name: "Todoist Label Mode",
            description: "Only import tasks with a specific label in Todoist",
            action: { type: "switch" },
        },
        {
            id: "uqcrr-label-id",
            name: "Todoist Label ID (optional)",
            description: "Define the Todoist label to import",
            action: { type: "input", placeholder: "" },
        },
        {
            id: "uqcrr-output-todo",
            name: "Output as TODO",
            description: "Import the item as a Roam TODO",
            action: { type: "switch" },
        },
        {
            id: "uqcrr-get-description",
            name: "Get Description",
            description: "Import the item description from Todoist",
            action: { type: "switch" },
        },
        {
            id: "uqcrr-no-tag",
            name: "No Tag",
            description: "Don't apply a tag in Roam Research",
            action: { type: "switch" },
        },
        {
            id: "uqcrr-created-date",
            name: "Created Date",
            description: "Import the item created date",
            action: { type: "switch" },
        },
        {
            id: "uqcrr-due-dates",
            name: "Due Dates",
            description: "Import the item due date",
            action: { type: "switch" },
        },
        {
            id: "uqcrr-priority",
            name: "Priority",
            description: "Import the item priority",
            action: { type: "switch" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Import Quick Capture items from Todoist",
            callback: () => importTodoist(),
        })

        /*
        const args = {
            text: 'IMPORTTODOIST',
            help: "Import Quick Capture items from Todoist",
            handler: (context) => importTodoistSB,
        }
        if (window.roamjs?.extension?.smartblocks) {
            window.roamjs.extension.smartblocks.registerCommand(args);
        } else {
            document.body.addEventListener(
                `roamjs:smartblocks:loaded`,
                () =>
                    window.roamjs?.extension.smartblocks &&
                    window.roamjs.extension.smartblocks.registerCommand(args)
            );
        }
        */

        const myToken = extensionAPI.settings.get("uqcrr-token");
        const TodoistAccount = extensionAPI.settings.get("uqcrr-account");
        const TodoistInboxId = extensionAPI.settings.get("uqcrr-inbox-id");
        const TodoistImportTag = extensionAPI.settings.get("uqcrr-import-tag");
        const TodoistHeader = extensionAPI.settings.get("uqcrr-import-header");
        const TodoistLabelMode = extensionAPI.settings.get("uqcrr-label-mode");
        const TodoistLabelId = extensionAPI.settings.get("uqcrr-label-id");
        const TodoistOutputTodo = extensionAPI.settings.get("uqcrr-output-todo");
        const TodoistGetDescription = extensionAPI.settings.get("uqcrr-get-description");
        const TodoistNoTag = extensionAPI.settings.get("uqcrr-no-tag") || "False";
        const TodoistCreatedDate = extensionAPI.settings.get("uqcrr-created-date");
        const TodoistDueDates = extensionAPI.settings.get("uqcrr-due-dates");
        const TodoistPriority = extensionAPI.settings.get("uqcrr-priority");

        async function importTodoist() {

            var url = "https://api.todoist.com/rest/v1/tasks?project_id=" + TodoistInboxId + "";
            if (TodoistLabelMode == "Label") {
                url += "&label_id=" + TodoistLabelId + "";
            }

            var bearer = 'Bearer ' + myToken;
            var myTasks = $.ajax({ url: url, type: "GET", async: false, headers: { Authorization: bearer }, }).responseText;
            var task;

            let taskList = [];
            let subTaskList = [];
            for await (task of JSON.parse(myTasks)) {
                if (task.hasOwnProperty('parent_id')) {
                    subTaskList.push({ id: task.id, parent_id: task.parent_id, order: task.order, content: task.content });
                } else {
                    taskList.push({ id: task.id, uid: "temp" });
                }
            }

            var thisBlock = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
            await window.roamAlphaAPI.updateBlock({
                block: {
                    uid: thisBlock,
                    string: TodoistHeader
                }
            });

            for (var i = 0; i < taskList.length; i++) {
                for await (task of JSON.parse(myTasks)) {
                    if (taskList[i].id == task.id) {
                        // print task
                        var itemString = "";
                        if (TodoistOutputTodo == true) {
                            itemString += "{{[[TODO]]}} "
                        }
                        itemString += "" + task.content + "";
                        if (TodoistNoTag !== true) {
                            itemString += " #[[" + TodoistImportTag + "]]";
                        }
                        if (TodoistCreatedDate == true) {
                            var createdDate = task.created.split("T");
                            itemString += " Created: [[" + convertToRoamDate(createdDate[0]) + "]]";
                        }
                        if (TodoistDueDates == true && task.hasOwnProperty('due')) {
                            itemString += " Due: [[" + convertToRoamDate(task.due.date) + "]]";
                        }
                        if (TodoistPriority == true) {
                            if (task.priority == "4") {
                                var priority = "1";
                            } else if (task.priority == "3") {
                                var priority = "2";
                            } else if (task.priority == "2") {
                                var priority = "3";
                            } else if (task.priority == "1") {
                                var priority = "4";
                            }
                            itemString += " #Priority-" + priority + "";
                        }

                        const uid = window.roamAlphaAPI.util.generateUID();
                        await window.roamAlphaAPI.createBlock({
                            location: { "parent-uid": thisBlock, order: i },
                            block: { string: itemString, uid }
                        });

                        // print description
                        if (TodoistGetDescription == true && task.description) {
                            const uid1 = window.roamAlphaAPI.util.generateUID();
                            await window.roamAlphaAPI.createBlock({
                                location: { "parent-uid": uid, order: 1 },
                                block: { string: task.description, uid1 }
                            });
                        }

                        // print comments
                        if (task.comment_count > 0) {
                            var url = "https://api.todoist.com/rest/v1/comments?task_id=" + task.id + "";
                            var myComments = $.ajax({ url: url, type: "GET", async: false, headers: { Authorization: bearer }, }).responseText;
                            let commentsJSON = await JSON.parse(myComments);
                            var commentString = "";
                            for (var j = 0; j < commentsJSON.length; j++) {
                                commentString = "";
                                if (commentsJSON[j].hasOwnProperty('attachment') && TodoistAccount == "Premium") {
                                    if (commentsJSON[j].attachment.file_type == "application/pdf") {
                                        commentString = "{{pdf: " + commentsJSON[j].attachment.file_url + "}}";
                                    } else if (commentsJSON[j].attachment.file_type == "image/jpeg" || commentsJSON[j].attachment.file_type == "image/png") {
                                        commentString = "![](" + commentsJSON[j].attachment.file_url + ")";
                                    } else {
                                        commentString = "" + commentsJSON[j].content + "";
                                    }
                                } else if (commentsJSON[j].hasOwnProperty('attachment')) {
                                    if (commentsJSON[j].attachment.file_type == "text/html") {
                                        commentString = "" + commentsJSON[j].content + " [Email Body](" + commentsJSON[j].attachment.file_url + ")";
                                    }
                                } else {
                                    commentString = "" + commentsJSON[j].content + "";
                                }

                                if (commentString.length > 0) {
                                    const newBlock = window.roamAlphaAPI.util.generateUID();
                                    await window.roamAlphaAPI.createBlock({
                                        location: { "parent-uid": uid, order: j + 1 },
                                        block: { string: commentString, newBlock }
                                    });
                                }
                            }
                        }

                        // print subtasks
                        for (var k = 0; k < subTaskList.length; k++) {
                            let q = `[:find (pull ?page
                                [:node/title :block/string :block/uid :block/heading :block/props 
                                 :entity/attrs :block/open :block/text-align :children/view-type
                                 :block/order {:block/children ...}
                                ])
                             :where [?page :block/uid "${uid}"]  ]`;
                            var results = await window.roamAlphaAPI.q(q);
                            var children;

                            if (results[0][0].hasOwnProperty('children')) {
                                children = results[0][0].children.length;
                            } else {
                                children = 0;
                            }

                            if (subTaskList[k].parent_id == task.id) {
                                const newBlock = window.roamAlphaAPI.util.generateUID();
                                await window.roamAlphaAPI.createBlock({
                                    location: { "parent-uid": uid, order: k + children },
                                    block: { string: subTaskList[k].content, newBlock }
                                });
                            }
                        }
                    }

                    var url = "https://api.todoist.com/rest/v1/tasks/" + task.id + "";
                    var settings = {
                        "url": url,
                        "method": "DELETE",
                        "timeout": 0,
                        "headers": {
                            "Authorization": bearer
                        },
                    };
                    $.ajax(settings);
                }
            }
        }
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Import Quick Capture items from Todoist'
        });
    }
}

function convertToRoamDate(dateString) {
    var parsedDate = dateString.split('-');
    var year = parsedDate[0];
    var month = Number(parsedDate[1]);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var monthName = months[month - 1];
    var day = Number(parsedDate[2]);
    let suffix = (day >= 4 && day <= 20) || (day >= 24 && day <= 30)
        ? "th"
        : ["st", "nd", "rd"][day % 10 - 1];
    return "" + monthName + " " + day + suffix + ", " + year + "";
}
