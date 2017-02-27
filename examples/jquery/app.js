let me;
let OCF;

const setup = function() {

    // OCF Configure
    OCF = OpenChatFramework.create({
        rltm: {
            // service: 'pubnub', 
            // config: {
            //     publishKey: 'pub-c-07824b7a-6637-4e6d-91b4-7f0505d3de3f',
            //     subscribeKey: 'sub-c-43b48ad6-d453-11e6-bd29-0619f8945a4f',
            //     restore: false
            // }
            service: 'socketio',
            config: {
                endpoint: 'localhost:9000'
            }
        },
        globalChannel: 'ocf-demo-jquery-kitchensink-20'
    });

    OCF.onAny((event, data) => {
        // console.log(event, data);
    });

}

const $chatTemplate = function(chat) {

    let html = 
        '<div class="chat col-xs-6" id="' + chat.channel + '">' + 
            '<div class="card">' + 
                '<div class="card-header">' + 
                    '<div class="col-sm-6">'  + 
                         chat.channel +
                    '</div>' + 
                    '<div class="col-sm-6 text-right">' +
                        '<a href="#" class="close">x</a>' +
                    '</div>' +
                '</div>' +

                '<ul class="online-list-sub list-group list-group-flush"></ul>' + 
                '<div class="card-block">' + 
                    '<div class="log"></div>' + 
                    '<p class="typing text-muted"></p>' + 
                    '<form class="send-message">' + 
                        '<div class="input-group">' + 
                            '<input type="text" class="form-control message" placeholder="Your Message...">' + 
                            '<span class="input-group-btn">' + 
                                '<button class="btn btn-primary" type="submit">Send</button>' + 
                            '</span>' + 
                        '</div>' + 
                    '</form>' + 
                '</div>' + 
            '</div>' + 
        '</div>';

    // define a HTML template for the new chatroom
    return $(html);

};

const $messageTemplate = function(payload, classes) {

    let html = 
        '<div class="'+classes+'">' + 
            '<p class="text-muted username">' + payload.sender.state().username + '</p>' + 
            '<p>' + payload.data.text + '</p>' + 
        '</div>';

    return $(html);
}

const $userTemplate = function(user, chat) {

    let state = user.state(chat);

    // create the HTML template for the user
    let html = 
        '<li class="' + user.uuid + ' list-group-item">' + 
            '<a href="#">' + state.username  + '</a> ' +
            '<span class="show-typing">is typing...</span>' + 
        '</li>';

    return $(html);

}

// function to create concept of "me"
const identifyMe = function() {

    // create a user for myself and store as ```me```
    me = OCF.connect(new Date().getTime().toString());

    me.plugin(OpenChatFramework.plugin.randomUsername(OCF.globalChat));

    // when I get a private invite
    me.direct.on('private-invite', (payload) => {
        // create a new chat and render it in DOM
        renderChat(new OCF.Chat(payload.data.channel));
    });

    // render the value of me in the GUI
    $('#me').text(me.state().username + ' with uuid: ' + me.uuid);

}

// GUI render functions

// render a OCF.User object in a list
const renderUser = function($el, user, chat) {

    // render user in this chat with their state from globalChat
    let $tpl = $userTemplate(user, OCF.globalChat);

    // listen for a click on the user
    $tpl.find('a').click(() => {

        // define a channel using the clicked user's username and this client's username
        let chan = OCF.globalChat.channel + '.' + [user.uuid, me.uuid].sort().join(':');

        // create a new chat with that channel
        let newChat = new OCF.Chat(chan);

        // render the new chat on the dom
        renderChat(newChat);

        // send the clicked user a private message telling them we invited them
        user.direct.send('private-invite', {channel: newChat.channel});

    });

    // hide "is typingIndicator..." by defualt
    $tpl.find('.show-typing').hide();

    let $existingEl = $el.find('.' + user.uuid);

    if($existingEl.length) {
        $existingEl.replaceWith($tpl);
    } else {

        // append the user element to the input element on dom
        $el.append($tpl);
           
    }

};

const removeUser = function($el, user) {
    $el.find('.' + user.uuid).remove();
}

// turn OCF.Chat into an online list
const renderOnlineList = function($el, chat) {

    for(var key in chat.users) {
        renderUser($el, chat.users[key], chat);
    }

    // when someone joins the chat
    chat.on('$ocf.online', (user) => {
        // render the user in the online list and bind events
        renderUser($el, user, chat);
    });

    // when someone joins the chat
    chat.on('$ocf.state', (user) => {

        // render the user in the online list and bind events
        renderUser($el, user, chat);
    });

    chat.on('$ocf.offline', (user) => {
        removeUser($el, user);
    });

    chat.plugin(OpenChatFramework.plugin.typingIndicator({
        timeout: 5000
    }));

}

// turn OCF.Chat into a chatroom
const renderChat = function(privateChat) {

    let $tpl = $chatTemplate(privateChat);

    // render the online list in the chatroom template
    renderOnlineList($tpl.find('.online-list-sub'), privateChat);

    // when someone types into the input box
    $tpl.find('.message').keypress((e) => {
        
        // if that keypress was not "Enter"
        if(e.which != 13) {

            // then tell OCF this user is typing
            privateChat.typingIndicator.startTyping();
        }

    });

    // when someone submits a message
    $tpl.find('.send-message').submit(() => {

        // tell OCF this user stopped typing
        privateChat.typingIndicator.stopTyping();

        // send the mssage over the network
        privateChat.send('message', {
            text: $tpl.find('.message').val()
        });

        // empty the input
        $tpl.find('.message').val('');

        return false;

    });

    // store the uuid of the user who sent the last message
    let lastSender = null

    // render a new message in the dom
    let renderMessage = (payload, classes) => {
        
        // a list of extra classes for the message div
        classes = classes || '';
        
        // if I didn't send this message
        if(payload.sender.constructor.name !== "Me") {
            // render it on the right
            classes += ' text-xs-right'
        }

        // if the uuid of the user who sent this message is the same as the last 
        if(lastSender == payload.sender.uuid) {
            // don't render the username again
            classes += ' hide-username';
        }

        // set the lastSender as the sender's uuid
        lastSender = payload.sender.uuid;

        // append the message to the chatroom log
        $tpl.find('.log').append($messageTemplate(payload, classes));

    }

    // when this chat gets a message
    privateChat.on('message', function(payload) {
        // render it in the DOM
        renderMessage(payload, null);
    });


    privateChat.plugin(OpenChatFramework.plugin.history());

    // if this chat receives a message that's not from this sessions
    privateChat.on('$history.message', function(payload) {
        // render it in the DOM with a special class
        renderMessage(payload, 'text-muted');
    });

    // when this chat gets the typing event
    privateChat.on('$typingIndicator.startTyping', (payload) => {

        // write some text saying that user is typing 
        $tpl.find('.typing').text(payload.sender.state().username + ' is typing...');

        // and show their typing indication next to their name in any other location
        $tpl.find('.' + payload.sender.uuid).find('.show-typing').show();

    });

    // when this chat gets notified someone stopped typing
    privateChat.on('$typingIndicator.stopTyping', (payload) => {

        // remove the indication text for this chat
        $tpl.find('.typing').text('');

        // and remove their indication in any other location on the page
        $('.' + payload.sender.uuid).find('.show-typing').hide();
    
    });

    // when someone closes a private chat
    $tpl.find('.close').click(() => {
        // remove the element from the DOM
        $tpl.remove();
        // @todo disconnect
    });

    // append the chat to the DOM
    $('#chats').append($tpl);

}

// bind the input from the search bar to the usernameSearch plugin
const bindUsernamePlugin = function() {

    OCF.globalChat.plugin(OpenChatFramework.plugin.onlineUserSearch());

    // when someone types in the username search
    $('#usernameSearch').on('change keyup paste click blur', () => {

        // get the full value of what they typed
        let val = $('#usernameSearch').val();

        // if the value is set
        if(val) {
            
            // call the plugin function to find out if that search query
            // matches anyone's username
            let online = OCF.globalChat.onlineUserSearch.search(val);

            // hide all the users
            $('#online-list').find('.list-group-item').hide();

            // loop through all the matching users
            online.forEach(function(user) {
                // and show them
                $('#online-list').find('.' + user.uuid).show();
            });

        } else {

            // if value is not set, show all users
            $('#online-list').find('.list-group-item').show();

        }

    });

}

// setup the OCF framework
setup();

// set up the concept of me and globalChat
identifyMe();

// render the OCF.globalChat now that it's defined
// this onlineList can spawn other chats
renderOnlineList($('#online-list'), OCF.globalChat);

OCF.globalChat.onAny(function(event, data){
    console.log(event, data)
})

// plug the search bar into the username plugin
bindUsernamePlugin();
