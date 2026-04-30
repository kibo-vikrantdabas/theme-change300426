  require(["modules/jquery-mozu" , "hyprlivecontext", "modules/analytics/contentPagesGTM" , 'underscore'], function ($,hyprlivecontext , contentPagesGTM, _) {
  
  var pageContext = require.mozuData('pagecontext');

  var sendEmail = function() {
    $(".email-subject-wrapper button").on('click', function(event){
      var selectedSubject = $('.choose-email-list option:selected').val(),
          replyToMail = hyprlivecontext.locals.themeSettings.customerServiceMail;
      if(selectedSubject) if(! selectedSubject.includes('Choose'))  window.location.assign("mailto:".concat(replyToMail, "?subject=", selectedSubject));
    });
  };

  var checkAndOpenDeliveryFAQ = function() {
     if(pageContext.cmsContext.template.path == 'delivery-collection') {
          if(!_.isNull(sessionStorage.getItem('isFromPDP'))) {
            $('.set:nth-child(2) a:first-of-type').addClass('active');
            $('.set:nth-child(2) div:first-of-type').show();
            sessionStorage.removeItem('isFromPDP');
          }
     }
  };

  $(document).ready(function () {
    $(".set > a").on("click", function () {
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
        $(this).siblings(".content").slideUp(200);
        //  $(".set > a i").removeClass("fa-minus").addClass("fa-plus");
      } else {
        //  $(".set > a i").removeClass("fa-minus").addClass("fa-plus");
        // $(this).find("i").removeClass("fa-plus").addClass("fa-minus");
        $(".set > a").removeClass("active");
        $(this).addClass("active");
        $(".content").slideUp(200);
        $(this).siblings(".content").slideDown(200);
      }
    });
   
    $(".sidebar-nav-text").on("click", function () {
      $(this).toggleClass("open");
      $(".sidebar-nav").slideToggle();
    });
  });

  var pageUrl = location.pathname;
  $(".left-sidebar ul li a").each(function () {
    var link = $(this);
    if (link.attr("href") == pageUrl) {
      link.addClass("active");
      var pageName = $("ul.sidebar-nav li a.active").text();
      $(".sidebar-nav-text").text(pageName);
    }
  });

  $(".left-sidebar ul li a").on("click", function(){
    var link = $(this);
    contentPagesGTM.sideBarOption(link);
  });

  $(".right-sidebar .other-section-content ul li a").on("click", function(){
    var link = $(this);
    contentPagesGTM.otherHelpOptionGTM(link);
  });

  $(".accordion-container .set a").on("click", function(){
    var link = $(this),
        headline = $(".accordion-container").prev().text();
    contentPagesGTM.contentQueryAnsGTM(link, headline);
  });

    sendEmail();

    checkAndOpenDeliveryFAQ();
});
