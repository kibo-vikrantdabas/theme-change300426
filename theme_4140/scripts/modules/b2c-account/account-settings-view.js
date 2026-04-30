define([
    "modules/jquery-mozu",
    "underscore",
    "hyprlive",
    "modules/editable-view",
    "modules/api",
    "modules/mobile-number-length"
], function($, _, Hypr, EditableView, api, MobileNumberChecker) {

    var isInvlidMobileNumber = false;

    var AccountSettingsView = EditableView.extend({
        templateName: "modules/my-account/my-account-settings",
        autoUpdate: [
          "firstName", 
          "lastName", 
          "contactAddress",
          "dayOfBirth", 
          "monthOfBirth", 
          "yearOfBirth", 
          "gender", 
          "userMobileNumber"
        ],
        constructor: function () {
          EditableView.apply(this, arguments);
          this.editing = false;
          this.invalidFields = {};
        },
        additionalEvents: {
          "input .mz-accountsettings-mobileinput":"validateMobileNumberLength",
        },
        initialize: function () {
          var self = this;
          return this.model.getAttributes().then(function (customer) {
            customer.get("attributes").each(function (attribute) {
              if(attribute.get("attributeCode") == "user_cf_e_gender"){
                if(attribute.get("values") && Array.isArray(attribute.get("values"))){
                  self.model.set('gender', attribute.get("values")[0]);
                }
                
              }
              else if(attribute.get("attributeCode") == "user_cf_e_date_of_birth"){
                if(attribute.get("values") && Array.isArray(attribute.get("values"))){
                   var dob = attribute.get("values")[0].split("-");
                     self.model.set('dayOfBirth', dob[0]);
                     self.model.set('monthOfBirth', dob[1]);
                     self.model.set('yearOfBirth', dob[2]);
                }
              }
              else if(attribute.get("attributeCode") == "customer-registered-mobile"){
                if(attribute.get("values") && Array.isArray(attribute.get("values"))){
                  var phoneNumbersVal = attribute.get("values")[0].split(" ");
                  self.model.set('userMobileNumber', phoneNumbersVal[1]);
                }
              }
              attribute.set("attributeDefinitionId", attribute.get("id"));
              self.render();
            });
            return customer;
          });
          
        },

        openPasswordSection: function () {
          document.body.scrollTop = 0; // For Safari
          document.documentElement.scrollTop = 0;
          $("body").addClass("pass-section-body");
          $("#account-settings").hide();
          $("#password-section").show();
        },

        updateAttribute: function (e) {
          var self = this;
          var attributeFQN = e.currentTarget.getAttribute("data-mz-attribute");
          var attribute = this.model.get("attributes").findWhere({
            attributeFQN: attributeFQN,
          });
          var nextValue =
            attribute.get("inputType") === "YesNo" ? $(e.currentTarget).prop("checked"): $(e.currentTarget).val();
    
          attribute.set("values", [nextValue]);
          attribute.validate("values", {
            valid: function (view, attr, error) {
              self
                .$('[data-mz-attribute="' + attributeFQN + '"]')
                .removeClass("is-invalid")
                .next('[data-mz-validationmessage-for="' + attr + '"]')
                .text("");
            },
            invalid: function (view, attr, error) {
              self
                .$('[data-mz-attribute="' + attributeFQN + '"]')
                .addClass("is-invalid")
                .next('[data-mz-validationmessage-for="' + attr + '"]')
                .text(error);
            },
          });
        },

        startEdit: function (event) {
          event.preventDefault();
          this.editing = true;
          this.render();
          
          this.aboutValidation();
        },

        aboutValidation: function () {
          $(".mz-accountsettings-aboutyou input").keyup(function () {
            var empty = false;
            $(".mz-accountsettings-aboutyou input.required-field").each(
              function () {
                if ($(this).val() === "") empty = true;
              }
            );
    
            document.getElementById("saveabout").disabled = empty;

            if(!empty)  document.getElementById("saveabout").disabled = isInvlidMobileNumber;

            if (!empty) $("#saveabout").css({ background: "#b7c74e" });
           
          });
        },

        cancelEdit: function () {
          this.editing = false;
          this.afterEdit();
        },

        onGenderChange: function(event) {
          var attribute = this.model.get("attributes").findWhere({attributeCode: "user_cf_e_gender"});
          attribute.set("values", [$(event.target).val()]);
        },
        
        finishEdit: function () {
          var self = this;

          this.updateDOB();

          this.doModelAction("apiUpdate")
            .then(function () {
              self.editing = false;
              $(document).scrollTop(0);
            })
            .otherwise(function () {
              self.editing = true;
            })
            .ensure(function () {
              self.afterEdit();
            });
        },

        afterEdit: function () {
          var self = this;
    
          self.initialize().ensure(function () {
            self.render();
            $(".accountsettings-alert-message .mz-message-item").html("<span class='icon-check-arrow'></span>"+ Hypr.getLabel('savedChangesMessage'));
            
            $(".accountsettings-alert-message").removeClass("hidden");
          });
        },

        validateMobileNumberLength: function(event) { 
          MobileNumberChecker.requriedMobileNumberLength(event); 
          var attributePhoneNumber = this.model.get("attributes").findWhere({attributeCode: "customer-registered-mobile"});
          var finalPhoneNumber = Hypr.getThemeSetting("countrySpecificDialingCode")+" "+$("#account-settings").find('.mz-accountsettings-mobileinput').val();
          attributePhoneNumber.set("values", [finalPhoneNumber]);
          if(MobileNumberChecker.validateMobileNumberFormat(event.target.value) && event.target.value.length >= MobileNumberChecker.getAllowedPhoneNumberLength()) {
            $("#account-settings").find('.mz-accountsettings-mobileinput').removeClass("is-invalid");
            document.getElementById('saveabout').disabled = event.target.value.length < MobileNumberChecker.getAllowedPhoneNumberLength() ? true : false;
            isInvlidMobileNumber = event.target.value.length < MobileNumberChecker.getAllowedPhoneNumberLength() ? true : false; 
          }
          else {
            $("#account-settings").find('.mz-accountsettings-mobileinput').addClass("is-invalid");
            document.getElementById('saveabout').disabled = true;
            isInvlidMobileNumber = true; 
          }
          
        },
        updateDOB: function() {
          if(this.model.get('dayOfBirth') && this.model.get('monthOfBirth') && this.model.get('yearOfBirth')) {
            var dobOfBirth = this.model.get('dayOfBirth') +'-'+ this.model.get('monthOfBirth')+'-'+this.model.get('yearOfBirth'),
                attributeDob = this.model.get("attributes").findWhere({attributeCode: "user_cf_e_date_of_birth"});
                attributeDob.set("values", [dobOfBirth]);
           }
        }

      });

      return AccountSettingsView;
    
});