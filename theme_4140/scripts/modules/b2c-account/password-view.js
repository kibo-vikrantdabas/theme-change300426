define([
    "modules/jquery-mozu",
    "underscore",
    "hyprlive",
    "modules/editable-view"
], function($, _, Hypr, EditableView) {

    /** I have just Modularized The Code Which was written in myaccount.js file. I did not change 
     * any logic. However there is lots of Jquery Methods are being used which must be 
     * replaced by the Model properties. Hence this code needs to be improved.
     * 
     * CODE is written By BORN Dev's
     */

    var validateChangePassowrd =  function (obj) {
        var empty = false;
        var accountPasswordMsg = '';
        var accountConfirmPasswordMsg = '';
        $(".account-confirm-passowrd-error-msg,.account-confirm-passowrd-error-msg").addClass("hidden");
        var password;
        if(obj.attr('id') === "account-password") {
          password= obj.val();
          var decimal=  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s)/;
          if (password === '') {
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signuppasswordValidationMessage'));
            $('.account-passowrd-error-msg').removeClass('hidden'); 
          }
          else if(password!=='' && password.length >=6 && !password.match(/[0-9]/)  && !password.match(/[^a-zA-Z0-9]/) && !password.match(/[A-Z]/) ) {
          
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('changePasswordStrengthMessage'));
            $('.account-passowrd-error-msg').removeClass('hidden'); 
            
          } else if (password !== '' && password.length >=6 && !password.match(/[0-9]/)  && !password.match(/[^a-zA-Z0-9]/) && (password.match(/[A-Z]/) || password.match(/[a-z]/) ) && !password.match(decimal)){
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText2'));
            $('.account-passowrd-error-msg').removeClass('hidden'); 
          }
          else if (password !== '' && password.length >=6 && password.match(/[0-9]/)  && !password.match(/[^a-zA-Z0-9]/) && !password.match(/[A-Z]/) && !password.match(decimal)){
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText1'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if (password !== '' && password.length >=6 && password.match(/[0-9]/) && (password.match(/[A-Z]/)) &&  !password.match(/[a-z]/) && !password.match(/[^a-zA-Z0-9]/) && !password.match(decimal) )
          {
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText7'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if (password !== '' && password.length >=6 && password.match(/[0-9]/) && (password.match(/[a-z]/)) && (!password.match(/[A-Z]/))  &&  !password.match(/[^a-zA-Z0-9]/) && !password.match(decimal) )
          {
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText3'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if (password !== '' && password.length >=6 && password.match(/[0-9]/)  && password.match(/[^a-zA-Z0-9]/) && !password.match(/[A-Z]/) && !password.match(decimal) )
          {
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText3'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if(password !== '' && password.length >=6 && password.match(/[^a-zA-Z0-9]/) &&  !password.match(/[0-9]/) && !password.match(/[A-Z]/) && !password.match(decimal)){
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText4'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if(password !== '' && password.length >=6 && password.match(/[^a-zA-Z0-9]/) && !password.match(/[0-9]/) && password.match(/[A-Z]/) && !password.match(decimal) ){
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText5'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }else if (password !== '' && password.length >=6 && password.match(/[0-9]/) && password.match(/[A-Z]/) && !password.match(/[^a-zA-Z0-9]/) && !password.match(decimal)){
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signUpFormPasswordValidationMessage'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if (password !== '' && password.length >=6 && password.match(/[0-9]/) && password.match(/[A-Z]/) && password.match(/[^a-zA-Z0-9]/) && !password.match(/[a-z]/) && !password.match(decimal)){
            obj.removeClass('valid').addClass('invalid');
            empty = true;      
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('signupPasswordValidationText6'));
            $('.account-passowrd-error-msg').removeClass('hidden');
          }
          else if(password !== '' && password.length >=6  && password.match(decimal)){
            obj.removeClass('invalid').addClass('valid');
            empty = false;      
            $('.account-passowrd-error-msg .error-message').html('');
            $('.account-passowrd-error-msg').addClass('hidden');
          }else{
            obj.removeClass('valid').addClass('invalid');
            empty = true;  
            $('.account-passowrd-error-msg .error-message').html(Hypr.getLabel('changePasswordStrengthMessage'));
            $('.account-passowrd-error-msg').removeClass('hidden'); 
          }
           
          if($("#account-confirmpassword").val() !== "" && $("#account-confirmpassword").val() !== password){
            empty = true;
            accountConfirmPasswordMsg = Hypr.getLabel('confirmPasswordValidation');
            $("#account-confirmpassword").removeClass('valid').addClass('invalid');
            $(".account-confirm-passowrd-error-msg .error-message").html(accountConfirmPasswordMsg);
            $(".account-confirm-passowrd-error-msg").removeClass("hidden");
          }
          else{
            $("#account-confirmpassword").removeClass('invalid').addClass('valid');
          }
           
        }
        else if(obj.attr('id') === "account-confirmpassword"){
          password = $("#account-password").val();
          $(".account-confirm-passowrd-error-msg").addClass("hidden");
          if($("#account-confirmpassword").val() !== "" && $("#account-confirmpassword").val() !== password){
            empty = true;
            accountConfirmPasswordMsg = Hypr.getLabel('confirmPasswordValidation');
            $("#account-confirmpassword").removeClass('valid').addClass('invalid');
            $(".account-confirm-passowrd-error-msg .error-message").html(accountConfirmPasswordMsg);
            $(".account-confirm-passowrd-error-msg").removeClass("hidden");
           }
           else {
            $("#account-confirmpassword").removeClass('invalid').addClass('valid');
           }
        }
    
        else if(obj.attr('id') === "account-oldpassword"){
         
          $(".account-old-passowrd-error-msg").addClass("hidden");
          if($("#account-oldpassword").val() === "" ){
            empty = true;
            accountConfirmPasswordMsg = Hypr.getLabel('genericRequired');
            $("#account-oldpassword").removeClass('valid').addClass('invalid');
            $(".account-old-passowrd-error-msg .error-message").html(accountConfirmPasswordMsg);
            $(".account-old-passowrd-error-msg").removeClass("hidden");
           }
           else {
            $("#account-oldpassword").removeClass('invalid').addClass('valid');
           }
        }
    
        var inputempty = false;
        $(".mz-accountsettings-password input").each(function () {
          if ($(this).val() === "") {
            inputempty = true;
          }
        });
    
        if (empty && !inputempty) {
          $("#savepwd").attr("disabled", "disabled");
          return false;
        } else if(!inputempty) {
          $("#savepwd").removeAttr("disabled");
          $("#savepwd").css({ background: "#b7c74e" });
          $("#savepwd").css({ color: "#333" });
          return true;
        }
    };

    var PasswordView = EditableView.extend({
        templateName: "modules/my-account/my-account-password",
        autoUpdate: ["oldPassword", "password", "confirmPassword"],
        startEditPassword: function () {
          this.editing.password = true;
          this.render();
          $("#savepwd").attr("disabled", "disabled");
          this.passwordValidation();
        },
        passwordValidation: function () {
          $(".mz-accountsettings-password input").keyup(function () {
            var empty = false;
            $(".mz-accountsettings-password input").each(function () {
              if ($(this).val() === "") {
                empty = true;
              }
            });
            if (empty) {
              $("#savepwd").attr("disabled", "disabled");
            } else {
              $("#savepwd").removeAttr("disabled");
            }
          });
        },
        validateChangePassowrdField: function(){
          var validStatus = false;
          if($("#account-oldpassword").val() === "") {
            $("#account-oldpassword").removeClass('valid').addClass('invalid');
            $(".account-old-passowrd-error-msg .error-message").html(Hypr.getLabel('genericRequired'));
            $(".account-old-passowrd-error-msg").removeClass("hidden");
            validStatus = true;
            
          }
          if($("#account-password").val() === "") {
            $("#account-password").removeClass('valid').addClass('invalid');
            validStatus = true;
          }
          if($("#account-confirmpassword").val() === "") {
            $("#account-confirmpassword").removeClass('valid').addClass('invalid');
            validStatus = true;
          }
          if(validStatus){
            return validStatus;
          }
          if(validateChangePassowrd($("#account-password")) && validateChangePassowrd($("#account-confirmpassword"))){
            validStatus =  true;
          }
          return validStatus;
        },
        finishEditPassword: function () {
          var self = this;
          $(".change-password-error").addClass("hidden");
          
          if(this.validateChangePassowrdField()){
            this.doModelAction("changePassword").then(
              function (response) {
                self.editing.password = false;
                _.delay(function () {
                  $('.pass-section-body .change-password-section .mz-accountsettings-password').addClass("remove-dotted-line");
                  document.body.scrollTop = 0; // For Safari
                  document.documentElement.scrollTop = 0;
                  self
                    .$('[data-mz-validationmessage-for="passwordChanged"]')
                    .show()
                    .text(Hypr.getLabel("passwordChangedNew"));
                    // .fadeOut(3000);
                }, 250);
              },
              function (response) {
                document.body.scrollTop = 0; // For Safari
                document.documentElement.scrollTop = 0;
                if(response.message === "Missing or invalid parameter: password Password must be different from the previous 4 utilized passwords.") {
                  $(".change-password-error li").html(Hypr.getLabel("oldPasswordAttemptFailed"));
                }
                else {
                  $(".change-password-error li").html(Hypr.getLabel("oldPasswordWrong"));
                }
                
                $(".change-password-error").removeClass("hidden");
                //self.editing.password = true;
              }
            );
            
          }
        },
        cancelEditPassword: function () {
          this.editing.password = false;
          this.render();
        },
    });

    $(document).ready(function() {

        $(document).on("blur", ".mz-accountsettings-password input", function () {
            validateChangePassowrd($(this));
              
        });

    });

    return PasswordView;
    
});