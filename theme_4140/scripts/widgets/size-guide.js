define(['modules/jquery-mozu'],
    function($) {
        $('.mz-size-guide-toggle-btn').click(function(){
			$('.mz-size-guide-toggle-btn').toggleClass('active');
			$('.unit-cm').toggleClass('active');
			$('.unit-in').toggleClass('active');
			//if any td has no innerhtml, make a dash
		});

		var units = $('.unit-cm');

		if(units.length !== 0){
			$('.mz-size-guide-unit-toggle').css("display", "flex");
		}
    }
);