define([
    "hyprlive",
    "hyprlivecontext",
    "modules/jquery-mozu",
    "underscore",
    "modules/editable-view",
    "modules/mobile-number-length"
], function(
    Hypr,
    HyprLiveContext,
    $,
    _,
    EditableView,
    MobileNumberChecker) {
        var isInvlidMobileNumber = false;

        var AddressBookView = EditableView.extend({
            templateName: "modules/my-account/my-account-addressbook",
            autoUpdate: [
              "editingContact.firstName",
              "editingContact.lastNameOrSurname",
              "editingContact.address.address1",
              "editingContact.address.address2",
              "editingContact.address.address3",
              "editingContact.address.address4",
              "editingContact.address.cityOrTown",
              "editingContact.address.countryCode",
              "editingContact.address.stateOrProvince",
              //  'editingContact.address.postalOrZipCode',
              "editingContact.address.addressType",
              "editingContact.phoneNumbers.home",
        
              "editingContact.isBillingContact",
              "editingContact.isPrimaryBillingContact",
              "editingContact.isShippingContact",
              "editingContact.isPrimaryShippingContact",
            ],
            renderOnChange: [
              "editingContact.address.countryCode",
              "editingContact.isBillingContact",
              "editingContact.isShippingContact",
            ],
            additionalEvents: {
              "input .mz-userMobileNumber":"validateMobileNumberLength",
              "change [data-mz-value='editingContact.address.address4']": "updateEditingContact.address.address4",
              "input [data-mz-value='editingContact.address.address4']": "updateEditingContact.address.address4",
            },
            
            
            beginAddContact: function (event) {
              event.preventDefault();
              $(document).scrollTop(0);
              this.editing.contact = "new";
              this.model.updateCountryCities();
              this.render();
              setTimeout(function(){
                
                $("#register1").attr("disabled", "disabled");
              },100);
              
              this.fieldValidations();      
              this.primaryBilling();
              $("body.account-addressbook-body").css("overflow", "hidden");
            },
           
            beginEditContact: function (e) {
              e.preventDefault();
              $(document).scrollTop(0);
              var id = (this.editing.contact =
                e.currentTarget.getAttribute("data-mz-contact"));
              this.model.beginEditContact(id);
              var homeNumber = this.model.get("editingContact").get("phoneNumbers").get("home");
              var finalPhoneNumber = homeNumber.split(" ");
              if(finalPhoneNumber.length > 0) {
                $(".bind-country-code").val(finalPhoneNumber[0]);
                this.model.get("editingContact").get("phoneNumbers").set("home",finalPhoneNumber[1]);
              }
              this.model.updateCountryCities();
              this.render();
              this.fieldValidations();
              $("body.account-addressbook-body").css("overflow", "hidden");
            },
            primaryBilling: function () {
              $(".billingContact").prop("checked", true);
              $(".shippingContact").prop("checked", true);
            },
            fieldValidations: function () {
              $("#phonenumber").on("keyup keypress blur", function (event) {
                $(this).val(
                  $(this)
                    .val()
                    .replace(/[^0-9\.]/g, "")
                );
                if (
                  (event.which != 46 || $(this).val().indexOf(".") != -1) &&
                  (event.which < 48 || event.which > 57)
                ) {
                  event.preventDefault();
                }
              });
              $(document).on("keyup change",".delivery-required-field", function () {
                
                var flag = false;
                $(".delivery-required-field").each(function () {
                  if ($(this).val() === "") {
                    flag = true;
                    return false;
                  }
                });        
                $("#register1").prop("disabled", flag); 

                if(!flag) $("#register1").prop("disabled", isInvlidMobileNumber);

              });
            },
            finishEditContact: function () {
              this.model.get("editingContact").set("isShippingContact", this.model.get('editingContact').get('isPrimaryShippingContact')? true : false);
              var countryCode = $(".bind-country-code").val();
              var homeNumber = this.model.get("editingContact").get("phoneNumbers").get("home");
              var finalPhoneNumber = countryCode+" "+homeNumber;
              this.model.get("editingContact").get("phoneNumbers").set("home",finalPhoneNumber);
              this.model.get("editingContact").get("address").set("postalOrZipCode","00000");
              var self = this,
                isAddressValidationEnabled =
                  HyprLiveContext.locals.siteContext.generalSettings
                    .isAddressValidationEnabled;
              var operation = this.doModelAction("saveContact", {
                forceIsValid: isAddressValidationEnabled,
              }); // hack in advance of doing real validation in the myaccount page, tells the model to add isValidated: true
              if (operation) {
                operation.otherwise(function () {
                  self.editing.contact = true;
                });
                this.editing.contact = false;
              }
              $("body.account-addressbook-body").css("overflow", "auto");
            },
            cancelEditContact: function () {
              this.editing.contact = false;
              this.model.endEditContact();
              this.render();
              $("body.account-addressbook-body").css("overflow", "auto");
            },
            beginDeleteContact: function (e) {
              var self = this,
                contact = this.model
                  .get("contacts")
                  .get(e.currentTarget.getAttribute("data-mz-contact")),
                associatedCards = this.model.get("cards").where({
                  contactId: contact.id,
                }),
                windowMessage = Hypr.getLabel(
                  "confirmDeleteContact",
                  contact.get("address").get("address1")
                ),
                doDeleteContact = function () {
                  return self.doModelAction("deleteContact", contact.id);
                },
                go = doDeleteContact;
        
              if (associatedCards.length > 0) {
                windowMessage += " " + Hypr.getLabel("confirmDeleteContact2");
                go = function () {
                  return self
                    .doModelAction(
                      "deleteMultipleCards",
                      _.pluck(associatedCards, "id")
                    )
                    .then(doDeleteContact);
                };
              }
        
              if (window.confirm(windowMessage)) {
                return go();
              }
            },
            validateMobileNumberLength: function(event) { 
              if(event.originalEvent.data == 'e' || event.originalEvent.data == 'E') return false;
               MobileNumberChecker.requriedMobileNumberLength(event); 
              if(MobileNumberChecker.validateMobileNumberFormat(event.target.value) && event.target.value.length >= MobileNumberChecker.getAllowedPhoneNumberLength()) {
                $(".afg-ms-accountaddressbook-form").find('.mz-userMobileNumber').removeClass("is-invalid");
                
                document.getElementById('register1').disabled = event.target.value.length < MobileNumberChecker.getAllowedPhoneNumberLength() ? true : false; 
                isInvlidMobileNumber = event.target.value.length < MobileNumberChecker.getAllowedPhoneNumberLength() ? true : false; 
                
                
              }
              else {
                $(".afg-ms-accountaddressbook-form").find('.mz-userMobileNumber').addClass("is-invalid");
                document.getElementById('register1').disabled = true;
                isInvlidMobileNumber = true; 
              }
            },

            handleDefaultAddress: function() {
              var cObj = this;
              this.model.get('editingContact').set('isShippingContact', true);
              this.model.get('editingContact').set('isPrimaryShippingContact', true);
              setTimeout(function(){
                cObj.validateFormField();
              },600);
            },
            validateFormField: function(){
              var flag = false;
                $(".delivery-required-field").each(function () {
                  if ($(this).val() === "") {
                    flag = true;
                    return false;
                  }
                });        
                $("#register1").prop("disabled", flag); 
                if(!flag) {
                  if(isInvlidMobileNumber) {
                    $(".afg-ms-accountaddressbook-form").find('.mz-userMobileNumber').addClass("is-invalid");
                  }
                  $("#register1").prop("disabled", isInvlidMobileNumber);
                }
            }
        });
    
    return AddressBookView;
    
});