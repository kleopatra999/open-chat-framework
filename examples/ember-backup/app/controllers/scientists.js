import Ember from 'ember';

export default Ember.Controller.extend({

    OCFS: Ember.inject.service('open-chat-framework'),
    me: null,
    messages: [],
    messageInput: '',
    init: function() {
      
        this._super();

        // create a user for myself and store as ```me```
        this.me = this.get('OCFS').OCF.connect(new Date().getTime());

        
        console.log(this.get('OCFS').OCF)
        
        this.me.plugin(this.get('OCFS').OCF.globalChat.plugin.randomUsername());

    },
    actions: {
        sendChat: function() {

            console.log('this called');
         
            if(this.messageInput) {
                
                this.OCF.globalChat.send('message', {
                    text: this.messageInput
                });

                // this.messageInput = '';

                Ember.set('messageInput', '');

            }

            return false;

        }
    }
});
