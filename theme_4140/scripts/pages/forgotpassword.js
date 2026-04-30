define(['modules/backbone-mozu',
    'modules/jquery-mozu',
    'hyprlive',
    'modules/editable-view',
    'modules/api',
    'hyprlivecontext'],


    function (Backbone, $, Hypr, EditableView, api, HyprLiveContext) {
    	var forgotpasswordView = EditableView.extend({
			templateName: 'modules/forgotpassword/forgotpasswordform',
			autoUpdate: [
			  'reset-password'
			],
            additionalEvents:{
                "click [data-mz-action='forgot-submit']":"retrievePassword",
                "keyup [data-mz-forgotpassword-email]":"checkResetEmail"
            },
            checkResetEmail:function(event){
                var $el = $(event.currentTarget);
                var email = $el.val().trim();
            if (email === '') {
                this.$el.find('[data-mz-forgotpassword-email]').addClass("is-invalid");
                this.$el.find('[data-mz-forgotpassword-email]').removeClass(" is-valid");
                this.$el.find('[data-mz-forgotpassword-email]').attr("placeholder",Hypr.getLabel('signupemailValidationMessage'));
            
                }else if(!this.isEmail(email)) {
                $('.mz-forgot-error-msg').removeClass('hidden');
                this.$el.find('[data-mz-forgotpassword-email]').addClass("is-invalid");
                this.$el.find('[data-mz-forgotpassword-email]').removeClass(" is-valid");
                $('.mz-forgot-error-msg').html(Hypr.getLabel('emailMissing'));
                }
                else {
                    this.$el.find('[data-mz-forgotpassword-email]').removeClass("is-invalid"); 
                    this.$el.find('[data-mz-forgotpassword-email]').addClass(" is-valid");
                    $('.mz-forgot-error-msg').html('');
                    $('.mz-forgot-error-msg').addClass('hidden');
                }
            },
            isEmail:function(email){
                var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
                return regex.test(email);
            },
            hashEmail:function(email){
                var hashSalt = 'make_this_unique';
                var hashed_email='';
                var self = this;
                window.crypto.subtle.digest(
                    'SHA-256',
                    new TextEncoder().encode(email.toLowerCase() + hashSalt)
                    ).then(function(hashed) {
                        // The digest is returned in a wonky format so we need to convert it to a hex string
                        var encryptedEmail = [].map.call(
                            new Uint8Array(hashed),
                            function(b) {
                                return ('00' + b.toString(16)).slice(-2);
                            }
                        ).join('');
                        // Done!
                        hashed_email = encryptedEmail;
                        self.model.set('hashed_email', encryptedEmail);
                    });
                 
            },
			retrievePassword: function(event) {
                event.preventDefault();
                var me = this;
                var email = this.$el.find('[data-mz-forgotpassword-email]').val();
                var hashed_email=  this.hashEmail(email);
               // console.log('hashed email',hashed_email);
                if (email === '') {
                    this.$el.find('[data-mz-forgotpassword-email]').addClass("is-invalid");
                    this.$el.find('[data-mz-forgotpassword-email]').attr("placeholder",Hypr.getLabel('signupemailValidationMessage'));
                   }
                   else if(!this.isEmail(email)){
                    this.$el.find('[data-mz-forgotpassword-email]').addClass("is-invalid");
                    $('.mz-forgot-error-msg').html(Hypr.getLabel('emailMissing'));
                    $('.mz-forgot-error-msg').removeClass('hidden');
                   }
                else {
                    this.$el.find('[data-mz-forgotpassword-email]').removeClass("is-invalid");
                    $('.mz-forgot-error-msg').addClass('hidden');
                    me.$el.addClass('is-loading');
                    api.action('customer', 'resetPasswordStorefront', {
                        EmailAddress: email
                    }).then(function(res){
                        me.$el.removeClass('is-loading');
                        
                        $('#forgotpasswordDiv').addClass('hidden');
                        $('#forgotpasswordMessage').removeClass('hidden');
                        $('.link-email').text(email);
                        if(window.globalEventBus){
                            window.globalEventBus.emit('dataLayerEvent', 
                            {
                                
                                'custom_event': 'account',
                                'event_params':{
                                    'event_act': 'forgot password',
                                    'event_lbl': 'send reset link',
                                    'hashed_email':me.model.get('hashed_email')
                                }
                            
                            }
                            );
                    }
                       
                    },function(err) {
                        //Error
                    	if(err){
                            $('.mz-forgot-error-msg').removeClass('hidden');
                    		$('.mz-forgot-error-msg').html(Hypr.getLabel('emailDoesnotExist'));
                    	}
                    });
                }
            },
            initialize:function(){
            },
			render: function() {
				Backbone.MozuView.prototype.render.apply(this); 
			}
		});

		var Model = Backbone.MozuModel.extend({
            validation: {
                  'reset-password': {
                    pattern: 'email',
                    msg: Hypr.getLabel('emailMissing')
                  }
		    }
        });
        
		var loginModel = new Model();
		var $efp = $('#forgotpassword');
		var forgotPasswordFormView = new forgotpasswordView({
		    el: $efp,
		    model: loginModel
		});
		forgotPasswordFormView.render();
		$(document).ready(function(){
        //   $('.forgotpassword-submit').on('click',function(){
             
        //   });
		});
    });