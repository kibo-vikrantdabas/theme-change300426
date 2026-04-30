define([
  "modules/backbone-mozu",
  "modules/jquery-mozu",
  "hyprlive",
  "modules/editable-view",
  "modules/api",
  "hyprlivecontext",
  "underscore",
  "modules/mobile-number-length",
], function (Backbone, $, Hypr, EditableView, api, HyprLiveContext, _, MobileNumberChecker) {
  var signupView = EditableView.extend({
    templateName: "modules/signup/signup-form",
    autoUpdate: ["first-name", "last-name", "mobile-number", "email-address", "password-first"],
    additionalEvents: {
      "click [data-mz-action='signup-submit']": "signup",
      "click #eye-password-register": "showPassword",
      "change .dropdown-toggle": "checkCountryDialedCode",
      "keyup .mz-signup-first": "checkFirstName",
      "keyup .mz-signup-last": "checkLastName",
      "keyup .mz-signup-email": "checkSignUpEmail",
      "keyup .mz-signup-password": "checkSignUpPassword",
      "input .mz-signup-mobile": "checkSignUpMobileNumber",
      "change [data-mz-signup-consent]": "checkforConsentChecked",
      //  "click .mz-payment-blue-selector:not(:checked)":"displayBlueModal",
      "touchstart .help-blue": "displayBluePopup",
      "touchend .help-blue": "hideBluePopup",
      "click [data-mz-signup-acceptsmarketing]": "addMarketingEventData",
    },
    addMarketingEventData: function (event) {
      if (window.globalEventBus && event.target.checked) {
        var eventData = {
          custom_event: "account",
          event_params: {
            event_act: "create an account",
            event_lbl: "agree to send email",
          },
        };
        window.globalEventBus.emit("dataLayerEvent", eventData);
      }
    },
    checkforConsentChecked: function (event) {
      var singupConsentVal = $(".signupConsent").is(":checked");
      if (singupConsentVal) {
        $(".signup-consent-validation-msg").text("");
      }
    },
    showPassword: function () {
      var passwordField = $("#password-first");
      if (passwordField && passwordField.attr("type") == "password") {
        passwordField.attr("type", "text");
        $(".eye-open").addClass("hidden");
        $(".eye-close").removeClass("hidden");
        $(".eye-close").addClass("visible");
      } else {
        passwordField.attr("type", "password");
        $(".eye-open").removeClass("hidden");
        $(".eye-close").removeClass("visible");
        $(".eye-close").addClass("hidden");
      }
    },
    changeCountryDialedCode: function (e) {
      var self = this;
      self.model.set("dialedCode", e.target.value);
    },
    signupValidation: function () {
      var first = $("[data-mz-signup-firstname]").val(),
        last = $("[data-mz-signup-lastname]").val(),
        email = $("[data-mz-signup-emailaddress]").val(),
        password = $("[data-mz-signup-password]").val(),
        countryCode = $("[data-mz-signup-countrycode]").val(),
        mobile = $("[data-mz-signup-mobilenumber]").val(),
        acceptsMarketing = this.$("[data-mz-signup-acceptsmarketing]").prop("checked"),
        payload = {
          account: {
            acceptsMarketing: acceptsMarketing,
            firstName: first,
            lastName: last,
            emailAddress: email,
            mobile: mobile,
            userName: email,
            countryCode: countryCode,
            contacts: [
              {
                email: email,
              },
            ],
          },
          password: password,
        };
      return this.validateAllField(payload);
    },
    validate: function (payload) {
      if (!payload.account.firstName)
        return (
          this.$("[data-mz-signup-firstname]").addClass("is-invalid"),
          this.$("[data-mz-signup-firstname]").attr("placeholder", Hypr.getLabel("signupfirstNameValidationMessage")),
          false
        );
      else if (!payload.account.lastName)
        return (
          this.$("[data-mz-signup-lastname]").addClass("is-invalid"),
          this.$("[data-mz-signup-lastname]").attr("placeholder", Hypr.getLabel("signuplastNameValidationMessage")),
          false
        );
      else if (!payload.account.countryCode) return this.$(".mz-mobile-country-code").addClass("is-invalid"), false;
      else if (!payload.account.mobile)
        return (
          this.$("[data-mz-signup-mobilenumber]").addClass("is-invalid-mobile"),
          this.$("[data-mz-signup-mobilenumber]").attr("placeholder", Hypr.getLabel("signupmobileValidationMessage")),
          false
        );
      else if (!payload.account.emailAddress)
        return (
          this.$("[data-mz-signup-emailaddress]").addClass("is-invalid"),
          this.$("[data-mz-signup-emailaddress]").attr("placeholder", Hypr.getLabel("signupemailValidationMessage")),
          false
        );
      else if (!payload.password)
        return (
          this.$("[data-mz-signup-password]").addClass("is-invalid"),
          this.$("[data-mz-signup-password]").attr("placeholder", Hypr.getLabel("signuppasswordValidationMessage")),
          false
        );
      return true;
    },
    ValidateForm: function (payload) {
      if (!payload.account.firstName) return $(".register-form .signup-submit").addClass("disabled"), false;
      else if (!payload.account.lastName) return $(".register-form .signup-submit").addClass("disabled"), false;
      else if (!payload.account.countryCode) return $(".register-form .signup-submit").addClass("disabled"), false;
      else if (!payload.account.mobile) return $(".register-form .signup-submit").addClass("disabled"), false;
      else if (!payload.account.emailAddress) return $(".register-form .signup-submit").addClass("disabled"), false;
      else if (!payload.password) return $(".register-form .signup-submit").addClass("disabled"), false;
      return true;
    },
    validateAllField: function (payload) {
      var validateFields = true;
      var regName = /^[ A-Za-z0-9_./#&+-]*$/;
      var regAlphabetName = /^[ \u0600-\u06FFA-Za-z0-9_./#&+-]*$/;
      var enableRecaptchaSignUp = Hypr.getThemeSetting("enableRecaptchaSignUp");
      if (!captchaEnable && enableRecaptchaSignUp){
       validateFields = false;
        $(".signup-consent-validation-msg1").text(Hypr.getLabel("signupValidationMessageCaptcha"));
      }
      if (!payload.account.firstName) {
        this.$("[data-mz-signup-firstname]").addClass("is-invalid");
        this.$("[data-mz-signup-firstname]").attr("placeholder", Hypr.getLabel("signupfirstNameValidationMessage"));
        validateFields = false;
      }
      else if(!regAlphabetName.test(payload.account.firstName)){
        // this.$("[data-mz-signup-firstname]").addClass("is-invalid");
        // $(".data-mz-signup-firstname1").attr("placeholder", Hypr.getLabel("signupfirstNameValidationMessage1"));
        $(".data-mz-signup-firstname1").text(Hypr.getLabel("signupfirstNameValidationMessage1"));
        validateFields = false;
      }
      if (!payload.account.lastName) {
        this.$("[data-mz-signup-lastname]").addClass("is-invalid");
        this.$("[data-mz-signup-lastname]").attr("placeholder", Hypr.getLabel("signuplastNameValidationMessage"));
        validateFields = false;
      }
      else if(!regAlphabetName.test(payload.account.lastName)){
        // this.$("[data-mz-signup-lastname]").addClass("is-invalid");
        // $(".data-mz-signup-lasstname1").attr("placeholder", Hypr.getLabel("signuplastNameValidationMessage1"));
        $(".data-mz-signup-lastname1").text(Hypr.getLabel("signuplastNameValidationMessage1"));
        validateFields = false;
      }
      if (!payload.account.countryCode) {
        this.$(".mz-mobile-country-code").addClass("is-invalid");
        validateFields = false;
      }
      if (!payload.account.mobile) {
        this.$("[data-mz-signup-mobilenumber]").addClass("is-invalid-mobile");
        if (window.matchMedia("(max-width: 1139px)").matches) {
          this.$el
            .find("[data-mz-signup-mobilenumber]")
            .attr("placeholder", Hypr.getLabel("signupmobileValidationMessageMobile"));
        } else {
          this.$el
            .find("[data-mz-signup-mobilenumber]")
            .attr("placeholder", Hypr.getLabel("signupmobileValidationMessage"));
        }
        validateFields = false;
      }
      else {
        if(!MobileNumberChecker.validateMobileNumberFormat(payload.account.mobile)){
          this.$el.find("[data-mz-signup-mobilenumber]").addClass("is-invalid-mobile");
          this.$el.find("[data-mz-signup-mobilenumber]").removeClass("is-valid");
          if (window.matchMedia("(max-width: 1139px)").matches) {
            this.$el
              .find("[data-mz-signup-mobilenumber]")
              .attr("placeholder", Hypr.getLabel("signupmobileValidationMessageMobile"));
          } else {
            this.$el
              .find("[data-mz-signup-mobilenumber]")
              .attr("placeholder", Hypr.getLabel("signupmobileValidationMessage"));
          }
          validateFields = false;
        }
      }
      if (!payload.account.emailAddress) {
        this.$("[data-mz-signup-emailaddress]").addClass("is-invalid");
        this.$("[data-mz-signup-emailaddress]").attr("placeholder", Hypr.getLabel("signupemailValidationMessage"));
        validateFields = false;
      }
      if (!payload.password) {
        this.$("[data-mz-signup-password]").addClass("is-invalid");
        this.$("[data-mz-signup-password]").attr("placeholder", Hypr.getLabel("signuppasswordValidationMessage"));
        validateFields = false;
      }
      return validateFields;
    },
    checkFirstName: function (event) {
      var $el = $(event.currentTarget);
      // var regName = /^[ A-Za-z0-9_./#&+-]*$/;
      var regName = /^[ \u0600-\u06FFA-Za-z0-9_./#&+-]*$/;
      var first = $el.val().trim();
      if (first === "") {
        $(".data-mz-signup-firstname1").hide();
        this.$el.find("[data-mz-signup-firstname]").addClass("is-invalid");
        this.$el.find("[data-mz-signup-firstname]").removeClass(" is-valid");
        this.$el
          .find("[data-mz-signup-firstname]")
          .attr("placeholder", Hypr.getLabel("signupfirstNameValidationMessage"));
      }
      else if(!regName.test(first)){
        $(".data-mz-signup-firstname1").text(Hypr.getLabel("signupfirstNameValidationMessage1"));
        validateFields = false;
        $(".data-mz-signup-firstname1").show();
      }
       else if (first !== "") {
        this.$el.find("[data-mz-signup-firstname]").removeClass("is-invalid");
        this.$el.find("[data-mz-signup-firstname]").addClass(" is-valid");
        $(".data-mz-signup-firstname1").text("");
      }
    },
    checkCountryDialedCode: function (event) {
      var $el = $(event.currentTarget);
      var dialedCode = $el.val().trim();
      var mobileNumber = $(".mz-signup-mobile").val();
      if (dialedCode === "") {
        this.$el.find(".mz-mobile-country-code").addClass("is-invalid");
        this.$el.find(".mz-mobile-country-code").removeClass(" is-valid");
      } else {
        if (mobileNumber.length == 9 || mobileNumber.length > 9) {
          this.checkBlueAccounts(mobileNumber, dialedCode);
        } else {
          $(".mz-noBlueAccount").addClass("deactive").removeClass("active");
        }
        this.$el.find(".mz-mobile-country-code").removeClass("is-invalid");
        this.$el.find(".mz-mobile-country-code").addClass(" is-valid");
      }
    },
    checkLastName: function (event) {
      var $el = $(event.currentTarget);
      var last = $el.val().trim();
      // var regName = /^[ A-Za-z0-9_./#&+-]*$/;
      var regName = /^[ \u0600-\u06FFA-Za-z0-9_./#&+-]*$/;
      var countryCode = $("[data-mz-signup-countrycode]").val();
      if (last === "") {
        $(".data-mz-signup-lastname1").hide();
        this.$el.find("[data-mz-signup-lastname]").addClass("is-invalid");
        this.$el.find("[data-mz-signup-lastname]").removeClass(" is-valid");
        this.$el
          .find("[data-mz-signup-lastname]")
          .attr("placeholder", Hypr.getLabel("signuplastNameValidationMessage"));
      }
      else if(!regName.test(last)){
        $(".data-mz-signup-lastname1").text(Hypr.getLabel("signuplastNameValidationMessage1"));
        validateFields = false;
        $(".data-mz-signup-lastname1").show();
      }
       else {
        this.$el.find("[data-mz-signup-lastname]").removeClass("is-invalid");
        this.$el.find("[data-mz-signup-lastname]").addClass(" is-valid");
        $(".data-mz-signup-lastname1").text("");
      }
      if (countryCode !== "") {
        this.$el.find(".mz-mobile-country-code").addClass(" is-valid");
      }
    },
    checkSignUpEmail: function (event) {
      var $el = $(event.currentTarget);
      var email = $el.val().trim();
      if (email === "") {
        $(".email-validation-msg").hide();
        this.$el.find("[data-mz-signup-emailaddress]").addClass("is-invalid");
        this.$el.find("[data-mz-signup-emailaddress]").removeClass(" is-valid");
        this.$el
          .find("[data-mz-signup-emailaddress]")
          .attr("placeholder", Hypr.getLabel("signupemailValidationMessage"));
      } else if (!this.isEmail(email)) {
        this.$el.find("[data-mz-signup-emailaddress]").addClass("is-invalid");
        this.$el.find("[data-mz-signup-emailaddress]").removeClass(" is-valid");
        $(".email-validation-msg").removeClass("hidden");
        $(".email-validation-msg").text(Hypr.getLabel("emailMissing"));
        $(".password-field").removeClass("form-div");
        $(".password-field").addClass("form-password-div");
        $(".email-validation-msg").show();
      } else {
        this.$el.find("[data-mz-signup-emailaddress]").removeClass("is-invalid");
        this.$el.find("[data-mz-signup-emailaddress]").addClass(" is-valid");
        $(".email-validation-msg").addClass("hidden");
        $(".email-validation-msg").text("");
        $(".password-field").addClass("form-div");
        $(".password-field").removeClass("form-password-div");
      }
    },
    checkSignUpPassword: function (event) {
      var $el = $(event.currentTarget);
      var password = $el.val();
      this.$el.find(".password-validation-msg").removeClass("hidden");
      this.$el.find(".password-validation-msg").text(Hypr.getLabel("passwordStrengthMessage"));
      this.checkPasswordStrength(password);
    },
    checkPasswordStrength: function (password) {
      var decimal = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s)/;
      if (password === "") {
        this.strongPasswordIndicator(5);
        this.$el
          .find("[data-mz-signup-password]")
          .attr("placeholder", Hypr.getLabel("signuppasswordValidationMessage"));
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("passwordStrengthMessage"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        !password.match(/[0-9]/) &&
        !password.match(/[^a-zA-Z0-9]/) &&
        !password.match(/[A-Z]/)
      ) {
        this.strongPasswordIndicator(4);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("passwordStrengthMessage"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        !password.match(/[0-9]/) &&
        !password.match(/[^a-zA-Z0-9]/) &&
        (password.match(/[A-Z]/) || password.match(/[a-z]/)) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(4);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText2"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[0-9]/) &&
        !password.match(/[^a-zA-Z0-9]/) &&
        !password.match(/[A-Z]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(4);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText1"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[0-9]/) &&
        password.match(/[A-Z]/) &&
        !password.match(/[a-z]/) &&
        !password.match(/[^a-zA-Z0-9]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(3);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText7"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[0-9]/) &&
        password.match(/[a-z]/) &&
        !password.match(/[A-Z]/) &&
        !password.match(/[^a-zA-Z0-9]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(3);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText3"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[0-9]/) &&
        password.match(/[^a-zA-Z0-9]/) &&
        !password.match(/[A-Z]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(3);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText3"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[^a-zA-Z0-9]/) &&
        !password.match(/[0-9]/) &&
        !password.match(/[A-Z]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(4);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText4"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[^a-zA-Z0-9]/) &&
        !password.match(/[0-9]/) &&
        password.match(/[A-Z]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(3);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText5"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[0-9]/) &&
        password.match(/[A-Z]/) &&
        !password.match(/[^a-zA-Z0-9]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(3);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signUpFormPasswordValidationMessage"));
      } else if (
        password !== "" &&
        password.length >= 6 &&
        password.match(/[0-9]/) &&
        password.match(/[A-Z]/) &&
        password.match(/[^a-zA-Z0-9]/) &&
        !password.match(/[a-z]/) &&
        !password.match(decimal)
      ) {
        this.strongPasswordIndicator(3);
        this.$el.find(".password-validation-msg").removeClass("hidden");
        this.$el.find(".password-validation-msg").text(Hypr.getLabel("signupPasswordValidationText6"));
      } else if (password !== "" && password.length >= 6 && password.match(decimal)) {
        this.strongPasswordIndicator(1);
        this.$el.find(".password-validation-msg").addClass("hidden");
      } else {
        this.strongPasswordIndicator(2);
      }
    },
    strongPasswordIndicator: function (flag) {
      if (flag === 1) {
        this.$el.find("[data-mz-signup-password]").addClass("is-valid");
        this.$el.find("[data-mz-signup-password]").removeClass("is-invalid");
        $(".register-form .password_s1").removeClass("weak-pass");
        $(".register-form .password_s2").removeClass("weak-pass");
        $(".register-form .password_s1").addClass("strong-pass");
        $(".register-form .password_s2").addClass("strong-pass");
        $(".register-form .password_s3").addClass("strong-pass");
      } else if (flag === 2) {
        $(".register-form .password_s1").removeClass("weak-pass");
        $(".register-form .password_s2").removeClass("weak-pass");
        $(".register-form .password_s1").removeClass("strong-pass");
        $(".register-form .password_s2").removeClass("strong-pass");
        $(".register-form .password_s3").removeClass("strong-pass");
      } else if (flag === 3) {
        this.$el.find("[data-mz-signup-password]").addClass("is-valid");
        this.$el.find("[data-mz-signup-password]").removeClass("is-invalid");
        $(".register-form .password_s1").addClass("weak-pass");
        $(".register-form .password_s2").addClass("weak-pass");
        $(".register-form .password_s3").removeClass("strong-pass");
        $(".register-form .password_s2").removeClass("strong-pass");
      } else if (flag === 4) {
        this.$el.find("[data-mz-signup-password]").addClass("is-valid");
        this.$el.find("[data-mz-signup-password]").removeClass("is-invalid");
        $(".register-form .password_s1").addClass("weak-pass");
        $(".register-form .password_s2").removeClass("weak-pass");
        $(".register-form .password_s2").removeClass("strong-pass");
        $(".register-form .password_s3").removeClass("strong-pass");
      } else if (flag === 5) {
        this.$el.find("[data-mz-signup-password]").addClass("is-invalid");
        this.$el.find("[data-mz-signup-password]").removeClass(" is-valid");
        $(".register-form .password_s1").removeClass("strong-pass");
        $(".register-form .password_s2").removeClass("strong-pass");
        $(".register-form .password_s3").removeClass("strong-pass");
        $(".register-form .password_s1").removeClass("weak-pass");
        $(".register-form .password_s2").removeClass("weak-pass");
      }
    },
    checkSignUpMobileNumber: function (event) {
      var $el = $(event.currentTarget);
      var mobileNumber = $el.val().trim();
      var dialedCode = Hypr.getThemeSetting("countrySpecificDialingCode");
      var numbers = /^[0-9]+$/;

      MobileNumberChecker.requriedMobileNumberLength(event);
      var numberValid = true;

      if (mobileNumber === "") {
        this.$el.find("[data-mz-signup-mobilenumber]").addClass("is-invalid-mobile");
        this.$el.find("[data-mz-signup-mobilenumber]").removeClass("is-valid");
        if (window.matchMedia("(max-width: 500px)").matches) {
          this.$el
            .find("[data-mz-signup-mobilenumber]")
            .attr("placeholder", Hypr.getLabel("signupmobileValidationMessageMobile"));
        } else {
          this.$el
            .find("[data-mz-signup-mobilenumber]")
            .attr("placeholder", Hypr.getLabel("signupmobileValidationMessage"));
        }
        numberValid = false;
      } else if (!mobileNumber.match(numbers)) {
        this.$el.find("[data-mz-signup-mobilenumber]").addClass("is-invalid-mobile");
        this.$el.find("[data-mz-signup-mobilenumber]").removeClass("is-valid");
        numberValid = false;
      }
      else if(!MobileNumberChecker.validateMobileNumberFormat(mobileNumber)){
        this.$el.find("[data-mz-signup-mobilenumber]").addClass("is-invalid-mobile");
        this.$el.find("[data-mz-signup-mobilenumber]").removeClass("is-valid");
        numberValid = false;
      }
      else {
        this.$el.find("[data-mz-signup-mobilenumber]").removeClass("is-invalid-mobile");
        this.$el.find("[data-mz-signup-mobilenumber]").removeClass("is-invalid");
        this.$el.find("[data-mz-signup-mobilenumber]").addClass("is-valid");
        
      }
      if (mobileNumber.length == 9 || mobileNumber.length > 9) {
        this.checkBlueAccounts(mobileNumber, dialedCode);
      } else {
        $(".mz-noBlueAccount").addClass("deactive").removeClass("active");
      }

      document.getElementsByClassName('signup-submit')[0].disabled = mobileNumber.length < MobileNumberChecker.getAllowedPhoneNumberLength() && numberValid ? true:false;

    },    
    formatMobileNumber: function (mobileNumber) {
      var formatMobileNumber;
      if (mobileNumber.includes("+")) formatMobileNumber = mobileNumber.substr(1);
      formatMobileNumber = formatMobileNumber ? formatMobileNumber.split(" ") : mobileNumber.split(" ");
      return formatMobileNumber && formatMobileNumber.length > 1 ? _.first(formatMobileNumber).concat(_.last(formatMobileNumber))
        : _.first(formatMobileNumber);
    },
    checkBlueAccounts: function (mobileNumber, dialedCode) {
      var customerMobileNumber = this.formatMobileNumber(dialedCode.concat(mobileNumber));
      api.request("POST", "/blue/checkCustomer?mobileNumber=" + customerMobileNumber).then(function (res) {
        if (!_.isUndefined(res))
          if (res.isBlueCustomer) $(".mz-noBlueAccount").addClass("active").removeClass("deactive");
      });
    },

    isEmail: function (email) {
      var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
      return regex.test(email);
    },
    passwordCheckforValidation: function () {
      var password = this.$("[data-mz-signup-password]").val();
      var decimal = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s)/;
      if (password !== "" && password.length > 6 && password.match(decimal)) {
        return true;
      } else {
        this.$el.find("[data-mz-signup-password]").addClass("is-invalid");
        this.$el.find("[data-mz-signup-password]").removeClass(" is-valid");
        this.$el
          .find("[data-mz-signup-password]")
          .attr("placeholder", Hypr.getLabel("signuppasswordValidationMessage"));
        return false;
      }
    },
    signup: function (event) {
      event.preventDefault();
      var singupConsent = false;
      var singupConsentVal = $(".signupConsent").is(":checked");
      if (singupConsentVal) {
        singupConsent = true;
      }

      if (this.signupValidation() && this.passwordCheckforValidation()) {
        if (singupConsent) {
          var dailedCode = Hypr.getThemeSetting("countrySpecificDialingCode");
          var me = this,
            acceptsMarketingCheck = this.$("[data-mz-signup-acceptsmarketing]").prop("checked"),
            first = this.$("[data-mz-signup-firstname]").val(),
            last = this.$("[data-mz-signup-lastname]").val(),
            email = this.$("[data-mz-signup-emailaddress]").val(),
            password = this.$("[data-mz-signup-password]").val(),
            mobile = this.$("[data-mz-signup-mobilenumber]").val(),
            acceptsMarketing = this.$("[data-mz-signup-acceptsmarketing]").val(),
            mobileNumber = dailedCode + " " + me.model.get("mobile-number");
          /*if(acceptsMarketing == 'on'){
                acceptsMarketingCheck = true;
              }*/
          var payload = {
            account: {
              acceptsMarketing: acceptsMarketingCheck,
              firstName: me.model.get("first-name"),
              lastName: me.model.get("last-name"),
              emailAddress: me.model.get("email-address"),
              userName: me.model.get("email-address"),
              contacts: [
                {
                  email: me.model.get("email-address"),
                  phoneNumbers: {
                    mobile: me.model.get("mobile-number"),
                  },
                },
              ],
              attributes: [
                {
                  fullyQualifiedName: "Tenant~customer-registered-mobile",
                  values: [mobileNumber],
                },
              ],
            },
            password: me.model.get("password-first"),
          };
          if (!this.model.validate()) {
            return api.action("customer", "createStorefront", payload).then(
              function (resp) {
                const hashSalt = "emailAddress" + "make_this_unique";

                window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashSalt)).then(function(hashed) {
                  var encryptedEmail = [].map
                      .call(new Uint8Array(hashed), function(b) {
                          return ("00" + b.toString(16)).slice(-2);
                      })
                      .join("");
                  var eventData = {
                      event: "eventTracker",
                      custom_event: "account",
                      event_params: {
                          event_act: "create an account",
                          event_lbl: "successfull",
                          email_hashed: encryptedEmail,
                      },
                  };
              
                  window.dataLayer.push(eventData);
              });

                window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || "") + "/myaccount";
              },
              function (err) {
                if (err.message === Hypr.getLabel("emailAlreadyExistsError")) {
                  window.scrollTo(0, 0);
                  $(".signup-popover-form").html(
                    '<span class="password-validation-msg error-text">' +
                      Hypr.getLabel("emailAlreadyExists") +
                      "</span>"
                  );
                } else {
                  $(".signup-popover-form").html('<span class="password-validation-msg">Something went wrong</span>');
                }
              }
            );
          }
        } else {
          $(".signup-consent-validation-msg").text(Hypr.getLabel("signupConsentValidationMsg"));
        }
      } else {
        // $(document).scrollTop(0);
        $(window).scrollTop(0);
      }
    },
    initialize: function () {
      var user = require.mozuData("user");
      if (user.isAuthenticated) {
        if (window.location.href.indexOf("/signup") > -1) {
          window.location.href = location.origin.concat((HyprLiveContext.locals.siteContext.siteSubdirectory||'')+"/myaccount");
        }
      }
    },
    render: function () {
      Backbone.MozuView.prototype.render.apply(this);
    },
    displayBluePopup: function () {
      $(".blue-popover-main-container").show();
    },
    hideBluePopup: function () {
      setTimeout(function () {
        $(".blue-popover-main-container").hide();
      }, 5000);
    },
  });

  var Model = Backbone.MozuModel.extend({
    defaults: {
      dialingcode: "",
    },
    validation: {
      "email-address": {
        pattern: "email",
      },
      "first-name": {
        required: true,
      },
      "last-name": {
        required: true,
      },
      "password-first": {
        required: true,
      },
      "mobile-number": {
        required: true,
      },
    },
  });
  var siginUpModel = new Model();
  var $signUpEl = $("#signUpContainer");
  var siginUpFormView = new signupView({
    el: $signUpEl,
    model: siginUpModel,
  });
  siginUpFormView.render();

  $("#blue-help")
    .on("mouseenter", function () {
      $(".blue-popover-main-container").show();
    })
    .on("mouseleave", function () {
      $(".blue-popover-main-container").hide();
    });
});

var captchaEnable = false;
function enableBtn(){
  captchaEnable = true;
  document.getElementById("button1").disabled = false;
}