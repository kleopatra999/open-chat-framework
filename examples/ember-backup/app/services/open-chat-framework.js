import Ember from 'ember';

export default Ember.Service.extend({
    init() { 

      this._super();

      let ocf = OpenChatFramework.create({
          rltm: {
              service: 'pubnub', 
              config: {
                  publishKey: 'pub-c-07824b7a-6637-4e6d-91b4-7f0505d3de3f',
                  subscribeKey: 'sub-c-43b48ad6-d453-11e6-bd29-0619f8945a4f',
                  restore: false
              }
          },
          globalChannel: 'ocf-demo-ember'
      });

      this.set('OCF', ocf);

    }

});
