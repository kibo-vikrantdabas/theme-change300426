define(['modules/backbone-mozu',
    'modules/jquery-mozu',
    'hyprlive',
    'modules/editable-view',
    'modules/api',
    'hyprlivecontext'],


    function (Backbone, $, Hypr, EditableView, api, HyprLiveContext) {
    	var forgotpasswordView = EditableView.extend({
			templateName: 'modules/forgotpassword/resetpassword',
			autoUpdate: [
			  'reset-password'
			],
            additionalEvents:{
                "click #eye-password-register1": "showPassword",
                "click #eye-password-register": "showPassword",
                "keyup [data-mz-reset-password]": "checkResetPassword",
                "keyup [data-mz-reset-confirmpassword]":"checkConfirmPassword"
            },
            showPassword: function(e) {
                var target = $(e.currentTarget);
                var pass = target.parent('div').find('.password');
                if(pass && pass.attr('type')=='password') {
                    pass.attr('type','text');
                  target.find('.eye-open').addClass('hidden');
                  target.find('.eye-close').removeClass('hidden');
                  target.find('.eye-close').addClass('visible');
                }
                else {
                    pass.attr('type','password');
                    target.find('.eye-open').removeClass('hidden');
                    target.find('.eye-close').removeClass('visible');
                    target.find('.eye-close').addClass('hidden');
                }
              },
              checkPassword:function(){
                var password = this.$el.find('[data-mz-reset-password]').val();
                if (password === '') {
                    this.$el.find('[data-mz-reset-password]').removeClass("is-valid");
                    this.$el.find('[data-mz-reset-password]').addClass("is-invalid");
                    this.$el.find('[data-mz-reset-password]').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
                  }
                  else {
                    this.$el.find('[data-mz-reset-password]').removeClass("is-invalid");
                    this.$el.find('[data-mz-reset-password]').addClass("is-valid");
                }
              },
            checkConfirmPassword:function(){
                var password = this.$el.find('[data-mz-reset-password]').val();
                var confimPassword = this.$el.find('[data-mz-reset-confirmpassword]').val();
                var $validationConfirmPassword = this.$el.find('.confirm-password-validation-msg');
                if(password === ''){
                  this.$el.find('[data-mz-reset-password]').removeClass("is-valid");
                  this.$el.find('[data-mz-reset-password]').addClass("is-invalid");
                  this.$el.find('[data-mz-reset-password]').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
               
                }
                if (confimPassword === '') {
                  this.$el.find('[data-mz-reset-confirmpassword]').removeClass("is-valid");
                  this.$el.find('[data-mz-reset-confirmpassword]').addClass("is-invalid");
                  this.$el.find('[data-mz-reset-confirmpassword]').attr("placeholder",Hypr.getLabel('confirmResetPassword'));
                }
                else if(confimPassword !== password) {
                  $(".mz-forgotpassword-page-button").attr("disabled", "disabled");
                  $validationConfirmPassword.html('<span tabindex="-1" >'+Hypr.getLabel('passwordsDoNotMatch')+'</span>');
                  this.$el.find('[data-mz-reset-confirmpassword]').removeClass("is-valid");
                  this.$el.find('[data-mz-reset-confirmpassword]').addClass("is-invalid");
                }
                else {
                    $validationConfirmPassword.html('');
                    $(".mz-forgotpassword-page-button").removeAttr("disabled");
                    this.$el.find('[data-mz-reset-confirmpassword]').removeClass("is-invalid");
                    this.$el.find('[data-mz-reset-confirmpassword]').addClass("is-valid");
                }
              
            },
            checkResetPassword: function(event) {
                var $el = $(event.currentTarget);
                var password = $el.val();
                this.checkPasswordStrength(password);
              },
             checkPasswordStrength:function(password){
                var decimal=  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s)/;
                if (password === '') {
                  this.strongPasswordIndicator(5);
                    this.$el.find('[data-mz-reset-password]').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
                    this.$el.find('.password-validation-msg').removeClass('hidden');
                    this.$el.find('.password-validation-msg').text(Hypr.getLabel('passwordStrengthMessage'));
                  }
                else if(password!=='' && password.length >= 6 && !password.match(/[0-9]/)  && !password.match(/[^a-zA-Z0-9]/) && !password.match(/[A-Z]/) ) {
                
                  this.strongPasswordIndicator(4);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('passwordStrengthMessage'));
                  
                } else if (password !== '' && password.length >= 6 && !password.match(/[0-9]/)  && !password.match(/[^a-zA-Z0-9]/) && (password.match(/[A-Z]/) || password.match(/[a-z]/) ) && !password.match(decimal)){
                  this.strongPasswordIndicator(4);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText2'));
                }
                else if (password !== '' && password.length >= 6 && password.match(/[0-9]/)  && !password.match(/[^a-zA-Z0-9]/) && !password.match(/[A-Z]/) && !password.match(decimal)){
                  this.strongPasswordIndicator(4);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText1'));
                }
                else if (password !== '' && password.length >= 6 && password.match(/[0-9]/) && (password.match(/[A-Z]/)) &&  !password.match(/[a-z]/) && !password.match(/[^a-zA-Z0-9]/) && !password.match(decimal) )
                {
                  this.strongPasswordIndicator(3);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText7'));
                }
                else if (password !== '' && password.length >= 6 && password.match(/[0-9]/) && (password.match(/[a-z]/)) && (!password.match(/[A-Z]/))  &&  !password.match(/[^a-zA-Z0-9]/) && !password.match(decimal) )
                {
                  this.strongPasswordIndicator(3);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText3'));
                }
                else if (password !== '' && password.length >= 6 && password.match(/[0-9]/)  && password.match(/[^a-zA-Z0-9]/) && !password.match(/[A-Z]/) && !password.match(decimal) )
                {
                  this.strongPasswordIndicator(3);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText3'));
                }
                else if(password !== '' && password.length >= 6 && password.match(/[^a-zA-Z0-9]/) &&  !password.match(/[0-9]/) && !password.match(/[A-Z]/) && !password.match(decimal)){
                  this.strongPasswordIndicator(4);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText4'));
                }
                else if(password !== '' && password.length >= 6 && password.match(/[^a-zA-Z0-9]/) && !password.match(/[0-9]/) && password.match(/[A-Z]/) && !password.match(decimal) ){
                  this.strongPasswordIndicator(3);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText5'));
                }else if (password !== '' && password.length >= 6 && password.match(/[0-9]/) && password.match(/[A-Z]/) && !password.match(/[^a-zA-Z0-9]/) && !password.match(decimal)){
                  this.strongPasswordIndicator(3);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signUpFormPasswordValidationMessage'));
                }
                else if (password !== '' && password.length >= 6 && password.match(/[0-9]/) && password.match(/[A-Z]/) && password.match(/[^a-zA-Z0-9]/) && !password.match(/[a-z]/) && !password.match(decimal)){
                  this.strongPasswordIndicator(3);
                  this.$el.find('.password-validation-msg').removeClass('hidden');
                  this.$el.find('.password-validation-msg').text(Hypr.getLabel('signupPasswordValidationText6'));
                }
                else if(password !== '' && password.length >= 6  && password.match(decimal)){
                    this.strongPasswordIndicator(1);
                    this.$el.find('.password-validation-msg').addClass('hidden');
                  }else{
                    this.strongPasswordIndicator(2);
                  }
              },
              strongPasswordIndicator:function(flag){
                      if(flag === 1){
                        this.$el.find('[data-mz-reset-password]').addClass("is-valid");
                        this.$el.find('[data-mz-reset-password]').removeClass("is-invalid");
                        $('.mz-reset-password-form .password_s1').removeClass('weak-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('weak-pass');
                        $('.mz-reset-password-form .password_s1').addClass('strong-pass');
                        $('.mz-reset-password-form .password_s2').addClass('strong-pass');
                        $('.mz-reset-password-form .password_s3').addClass('strong-pass');
                      }else if (flag === 2){
                        $('.mz-reset-password-form .password_s1').removeClass('weak-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('weak-pass');
                        $('.mz-reset-password-form .password_s1').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s3').removeClass('strong-pass');
                      } else if (flag === 3){
                        this.$el.find('[data-mz-reset-password]').addClass("is-valid");
                        this.$el.find('[data-mz-reset-password]').removeClass("is-invalid");
                        $('.mz-reset-password-form .password_s1').addClass('weak-pass');
                        $('.mz-reset-password-form .password_s2').addClass('weak-pass');
                        $('.mz-reset-password-form .password_s3').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('strong-pass');
                      } else if (flag === 4){
                        this.$el.find('[data-mz-reset-password]').addClass("is-valid");
                        this.$el.find('[data-mz-reset-password]').removeClass("is-invalid");
                        $('.mz-reset-password-form .password_s1').addClass('weak-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('weak-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s3').removeClass('strong-pass');
                      } else if (flag === 5){
                        this.$el.find('[data-mz-reset-password]').addClass("is-invalid");
                        this.$el.find('[data-mz-reset-password]').removeClass(" is-valid");
                        $('.mz-reset-password-form .password_s1').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s3').removeClass('strong-pass');
                        $('.mz-reset-password-form .password_s1').removeClass('weak-pass');
                        $('.mz-reset-password-form .password_s2').removeClass('weak-pass');
                      }
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
		var $efp = $('#resetpassword');
		var resetPasswordFormView = new forgotpasswordView({
		    el: $efp,
		    model: loginModel
		});
		resetPasswordFormView.render();
		$(document).ready(function(){
            $("#resetpasswordtoken").insertBefore(".resetPasswordFormGroup");
            var modalMessage = $('.mz-model-msg').val();
            if(modalMessage === 'Missing or invalid parameter: password Invalid password format.'){
              $('.password').addClass('is-invalid');
              $('.password').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
              $('.confirmpassword').attr("placeholder",Hypr.getLabel('confirmResetPassword'));
            }
            if( modalMessage === 'Passwords must match.'){
              var sentPass= $('.password-reload').val();
              var SentPassAll = sentPass.split(/[\s,]+/);
              var SentPassAlllast = SentPassAll[SentPassAll.length - 1];
              var sentConfirmPass =$('.confirmpassword-reload').val();
                            
              var sentConfirmPassAll = sentConfirmPass.split(/[\s,]+/);
              var SentConfirmPassAlllast = sentConfirmPassAll[sentConfirmPassAll.length - 1];
              if(sentPass ===''){
                $('.password').addClass('is-invalid');
                $('.password').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
                $('.confirmpassword').attr("placeholder",Hypr.getLabel('confirmResetPassword'));
                $("input[name='passwordconfirm']").val(SentConfirmPassAlllast);
              }else if(sentConfirmPass ===''){
                $('.confirmpassword').addClass('is-invalid');
                $('.password').val(SentPassAlllast);
                $('.confirmpassword').val('');
                $('.confirmpassword').attr("placeholder",Hypr.getLabel('confirmResetPassword'));
              }else {
                $('.password').addClass('is-invalid');
                $('.password').val(SentPassAlllast);
                $('.confirmpassword').addClass('is-invalid');
                $("input[name='passwordconfirm']").val(SentConfirmPassAlllast);
                $('.confirm-password-validation-msg').html('<span tabindex="-1" >'+Hypr.getLabel('passwordsDoNotMatch')+'</span>');
              }
            
            }
              if($('.passwordDone').val() === '1'){
                window.location.href=(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/home';
              }
         
		});
    });