angular.module('chatApp', ['open-chat-framework'])
    .run(['$rootScope', 'ngOCF', function($rootScope, ngOCF) {

        // OCF Configure
        $rootScope.OCF = OpenChatFramework.create({
            rltm: {
                service: 'socketio',
                config: {
                    endpoint: 'localhost:9000'
                }
            },
            globalChannel: 'ocf-demo-angular-2'
        });

        // bind open chat framework angular plugin
        ngOCF.bind($rootScope.OCF);

        $rootScope.OCF.onAny((event, data) => {
            // console.log(event, data);
        });

        // create a user for myself and store as ```me```
        $rootScope.me = $rootScope.OCF.connect(new Date().getTime());
    
        $rootScope.me.plugin(OpenChatFramework.plugin.randomUsername($rootScope.OCF.globalChat));

        // set a global array of chatrooms
        $rootScope.chats = [];

    }])
    .controller('Chat', function($scope) {

        $scope.chat.plugin(OpenChatFramework.plugin.typingIndicator({
            timeout: 5000
        }));


        $scope.chat.plugin(OpenChatFramework.plugin.history());

        // every chat has a list of messages
        $scope.messages = [];

        // we store the id of the lastSender
        $scope.lastSender = null;

        // leave a chatroom and remove from global chat list
        $scope.leave = (index) => {
            $scope.chat.leave();
            $scope.chats.splice(index, 1);
        }

        // send a message using the messageDraft input
        $scope.sendMessage = () => {
            $scope.chat.send('message', $scope.messageDraft);
            $scope.messageDraft = '';
        }

        // when we get notified of a user typing
        $scope.chat.on('$typingIndicator.startTyping', (event) => {
            event.sender.isTyping = true;
        });

        // when we get notified a user stops typing
        $scope.chat.on('$typingIndicator.stopTyping', (event) => {
            event.sender.isTyping = false;
        });

        // function to add a message to messages array
        let addMessage = (payload, isHistory) => {

            // if this message was from a history call
            payload.isHistory = isHistory;

            // if the last message was sent from the same user
            payload.sameUser = $scope.messages.length > 0 && payload.sender.uuid == $scope.messages[$scope.messages.length - 1].sender.uuid;
            
            // if this message was sent by this client
            payload.isSelf = payload.sender.uuid == $scope.me.uuid;

            // add the message to the array
            $scope.messages.push(payload);

        }

        // if this chat receives a message that's not from this sessions
        $scope.chat.on('$history.message', function(payload) {

            // render it in the DOM with a special class
            addMessage(payload, true);
        });

        // when this chat gets a message
        $scope.chat.on('message', function(payload) {
            // render it in the DOM
            addMessage(payload, false);
        });

    })
    .controller('OnlineUser', function($scope) {

        // create a new chat
        $scope.newChat = function(user) {

            // define a channel using the clicked user's username and this client's username
            let chan = $scope.OCF.globalChat.channel + '.' + [user.uuid, $scope.me.uuid].sort().join(':');

            // create a new chat with that channel
            let newChat = new $scope.OCF.Chat(chan);

            // send the clicked user a private message telling them we invited them
            user.direct.send('private-invite', {channel: newChat.channel});

            // add the chat to the list
            $scope.chats.push(newChat);

        };

    })
    .controller('ChatAppController', function($scope) {

        // bind chat to updates
        $scope.chat = $scope.OCF.globalChat;

        // when I get a private invite
        $scope.me.direct.on('private-invite', (payload) => {

            // create a new chat and render it in DOM
            $scope.chats.push(new $scope.OCF.Chat(payload.data.channel));

        });

        $scope.OCF.globalChat.plugin(OpenChatFramework.plugin.onlineUserSearch());

        // hide / show usernames based on input
        $scope.userSearch = {
            input: '',
            fire: () => { 

                // get a list of our matching users
                let found = $scope.OCF.globalChat.onlineUserSearch.search($scope.userSearch.input);
                
                // hide every user
                for(let uuid in $scope.chat.users) {
                    $scope.chat.users[uuid].hideWhileSearch = true;
                }

                // show all found users
                for(let i in found) {
                    $scope.chat.users[found[i].uuid].hideWhileSearch = false;
                }

            }
        };

    });
