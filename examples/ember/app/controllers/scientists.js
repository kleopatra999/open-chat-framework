import Ember from 'ember';

export default Ember.Controller.extend({

    OCF: null,
    me: null,
    messages: [],
    messageInput: '',
    init: function() {
      
        this._super();

        // test
        this.OCF = window.OpenChatFramework.create({
          rltm: {
              service: 'pubnub', 
              config: {
                  publishKey: 'pub-c-07824b7a-6637-4e6d-91b4-7f0505d3de3f',
                  subscribeKey: 'sub-c-43b48ad6-d453-11e6-bd29-0619f8945a4f',
                  restore: false
              }
          },
          globalChannel: 'ocf-demo-ember-2'
        });

        // create a user for myself and store as ```me```
        this.me = this.OCF.connect(new Date().getTime());
        
        this.me.plugin(window.OpenChatFramework.plugin.randomUsername(this.OCF.globalChat));

        this.OCF.globalChat.on('message', (payload) => {
          console.log(payload)
          this.messages.pushObject(payload);
        });

    },
    actions: {
        sendChat: function() {
         
            if(this.messageInput) {
                
                this.OCF.globalChat.send('message', {
                    text: this.messageInput
                });

                Ember.set(this, 'messageInput', '');

            }

            return false;

        }
    }
});