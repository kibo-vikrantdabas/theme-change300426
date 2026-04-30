define([
    "modules/jquery-mozu","underscore"
], function($,_) {
    
    $(document).ready(function () {    
	
        var autoSkift = 5000;
        var skift = setInterval(rotate, autoSkift);
        var slides = $('.slide');
        var container = $('#slides ul');
        var elm = container.find(':first-child').prop("tagName");
        var item_width;
        
        // Display width check
        var displayCheck = window.matchMedia("screen and (max-width: 500px)");
        if (displayCheck.matches){
            item_width = container.width() + 160;
        }else{
            item_width = container.width();
        }
        
        var previous = 'prev'; //id of previous button
        var next = 'next'; //id of next button
        slides.width(item_width); //set the slides to the correct pixel width
        container.parent().width(item_width);
        container.width(slides.length * item_width); //set the slides container to the correct total width
        container.find(elm + ':first').before(container.find(elm + ':last'));
        resetSlides();
        
        //if user clicked on prev button
        
        $('#buttons a').click(function (e) {
            //slide the item
            if (container.is(':animated')) {
                return false;
            }
            if (e.target.id == previous) {
                container.stop().animate({
                    'left': 0
                }, 1500, function () {
                    container.find(elm + ':first').before(container.find(elm + ':last'));
                    resetSlides();
                });
            }       
            if (e.target.id == next) {
                container.stop().animate({
                    'left': item_width * -2
                }, 1500, function () {
                    container.find(elm + ':last').after(container.find(elm + ':first'));
                    resetSlides();
                });
            }        
            //cancel the link behavior            
            return false;       
        });
        
        //if mouse hover, pause the auto rotation, otherwise rotate it    
        container.parent().mouseenter(function () {
            clearInterval(skift);
        }).mouseleave(function () {
            skift = setInterval(rotate, autoSkift);
        });
        
        function resetSlides() {
            //and adjust the container so current is in the frame
            container.css({
                'left': -1 * item_width
            });
        }

        $('#carousel').css('cursor', 'pointer');
        $('#carousel').mouseenter(function (e) {
            $('.slide a').css('text-decoration', 'underline');
        }).on('click', function(e){
            $(this).find('a')[1].click();
         }).mouseleave(function () {
            $('.slide a').css('text-decoration', 'none');
        });
        
    });
    
    //a simple function to click next link
    //a timer will call this function, and the rotation will begin
    function rotate() {
        $('#next').click();
    }

    function addQuickLinkBottomBorder(){
        var data = $('#mz-drop-zone-quickLinksCheck').children().length;
        if(data > 0){
            $(".mz-promo-bar").css({ borderBottom: "1px solid #ccc" });
        }
      }
    addQuickLinkBottomBorder();
});



