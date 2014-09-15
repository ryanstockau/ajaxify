// Ajaxify
// v1.0.2 - September 2014
// Fork of: https://github.com/browserstate/ajaxify
(function(window,undefined){
	
	// Prepare our Variables
	var
		History = window.History,
		$ = window.jQuery,
		document = window.document;

	// Check to see if History.js is enabled for our Browser
	if ( !History.enabled ) {
		return false;
	}

	// Wait for Document
	$(function(){
		// Prepare Variables
		var
			/* Application Specific Variables */
			contentSelector = '#content,article:first,.article:first,.post:first',
			extraSelector = '.ajaxify',
			$content = $(contentSelector).filter(':first'),
			contentNode = $content.get(0),
			$menu = $('.menu,#menu,#nav,nav:first,.nav:first').filter(':first'),
			activeClass = 'current_page_item current_menu_item active selected current youarehere',
			removeClass = 'current_page_item current_menu_item current_page_parent active selected current youarehere',
			activeSelector = '.current_page_item,.current_menu_item,.active,.selected,.current,.youarehere',
			menuChildrenSelector = '> li,> ul > li',
			completedEventName = 'statechangecomplete',
			/* Application Generic Variables */
			$window = $(window),
			$body = $(document.body),
			rootUrl = History.getRootUrl(),
			scrollOptions = {
				duration: 800,
				easing:'swing'
			};
		
		// Ensure Content
		if ( $content.length === 0 ) {
			$content = $body;
		}
		
		// Internal Helper
		$.expr[':'].internal = function(obj, index, meta, stack){
			// Prepare
			var
				$this = $(obj),
				url = $this.attr('href')||'',
				isInternalLink;
			
			// Check link
			isInternalLink = url.substring(0,rootUrl.length) === rootUrl || url.indexOf(':') === -1;
			
			// Ignore or Keep
			return isInternalLink;
		};
		
		// HTML Helper
		var documentHtml = function(html){
			// Prepare
			// <div class="document-body" class="home page page-id-2 page-template-default full-width">
			var result = String(html)
				.replace(/<\!DOCTYPE[^>]*>/i, '')
				.replace(/<(html|head|body|title|meta|script)([^(\>|class)]?)(class="([^"]*?)")?/gi,'<div $2 class="document-$1 $4"')
				.replace(/<\/(html|head|body|title|meta|script)\>/gi,'</div>')
			;
			
			// Return
			return $.trim(result);
		};
		
		// Ajaxify Helper
		$.fn.ajaxify = function(){
			// Prepare
			var $this = $(this);
			
			// Ajaxify
			$this.find('a:internal:not(.no-ajaxy)').click(function(event){
				// Prepare
				var
					$this = $(this),
					url = $this.attr('href'),
					title = $this.attr('title')||null;
				
				// Continue as normal for cmd clicks etc
				if ( event.which == 2 || event.metaKey ) { return true; }
				
				// Ajaxify this link
				History.pushState(null,title,url);
				event.preventDefault();
				return false;
			});
			
			// Chain
			return $this;
		};
		
		// Ajaxify our Internal Links
		$body.ajaxify();
		
		// Hook into State Changes
		$window.bind('statechange',function(){
			// Prepare Variables
			var
				State = History.getState(),
				url = State.url,
				relativeUrl = url.replace(rootUrl,'');

			// Set Loading
			$body.addClass('loading');

			// Start Fade Out
			// Animating to opacity to 0 still keeps the element's height intact
			// Which prevents that annoying pop bang issue when loading in new content
			$content.animate({opacity:0},800);
			
			$(extraSelector).animate({opacity:0},800);
			
			
			
			// Ajax Request the Traditional Page
			$.ajax({
				url: url,
				success: function(data, textStatus, jqXHR){
					// Prepare
					var
						$data = $(documentHtml(data)),
						$dataBody = $data.find('.document-body:first'),
						$dataContent = $dataBody.find(contentSelector).filter(':first'),
						$dataExtras = $dataBody.find(extraSelector),
						extraHtmls = [],
						$menuChildren, contentHtml, $scripts;
					
					// Fetch the scripts
					$scripts = $dataContent.find('.document-script');
					if ( $scripts.length ) {
						$scripts.detach();
					}

					
					// Fetch the content
					contentHtml = $dataContent.html()||$data.html();
					
					$dataExtras.each(function(index,element){
						extraHtmls.push( {
							'class' : $(this).attr('class'),
							'id' : $(this).attr('id'),
							'html' : $(this).html()
						} );
					});
					
					if ( !contentHtml ) {
						document.location.href = url;
						return false;
					}
					
					// Update the menu
					$menuChildren = $menu.find(menuChildrenSelector);
					$menuChildren.filter(activeSelector).removeClass(removeClass);
					$menuChildren = $menuChildren.has('a[href^="'+relativeUrl+'"],a[href^="/'+relativeUrl+'"],a[href^="'+url+'"]');
					$menuChildren.first().addClass(activeClass);

					// Update the content
					$content.stop(true,true);
					$content.promise().done(function(){
						$(this)
							.html(contentHtml)
							.ajaxify()
							.animate({opacity:1},800);
					});

					// Update the title
					document.title = $data.find('.document-title:first').text();
					try {
						document.getElementsByTagName('title')[0].innerHTML = document.title.replace('<','&lt;').replace('>','&gt;').replace(' & ',' &amp; ');
					}
					catch ( Exception ) { }
					
					for( var key in extraHtmls ) {	
					   if (extraHtmls.hasOwnProperty(key)) {
						 var obj = extraHtmls[key];
						 var the_html = obj.html;
						 var $element = $('#'+obj.id);
						 $element
							.promise().done(function(){
								$(this)
									.html(the_html)
									.ajaxify()
									.animate({opacity:1},800);
							});
					   }
					}
					
					// Update the classes
					var updating = { 'body':$dataBody, 'content':$dataContent };
					for( var key in updating ) {
					   if (updating.hasOwnProperty(key)) {
						   var obj = updating[key];
						   //console.log( 'Changing class of $(' + key + ') from "' + $(key).attr('class') + '" to "' + obj.attr('class') + '"' );
						   $(key).removeClass();
						   $(key).addClass( obj.attr('class') );
						   $(key).removeClass( 'document-' + key );
					   }
					}
					
					// Add the scripts
					$scripts.each(function(){
						var $script = $(this), scriptText = $script.text(), scriptNode = document.createElement('script');
						if ( $script.attr('src') ) {
							if ( !$script[0].async ) { scriptNode.async = false; }
							scriptNode.src = $script.attr('src');
						}
    						scriptNode.appendChild(document.createTextNode(scriptText));
						contentNode.appendChild(scriptNode);
					});

					// Complete the change
					if ( $body.ScrollTo||false ) { $body.ScrollTo(scrollOptions); } /* http://balupton.com/projects/jquery-scrollto */
					$body.removeClass('loading');
					$window.trigger(completedEventName);
	
					// Inform Google Analytics of the change
					if ( typeof window._gaq !== 'undefined' ) {
						window._gaq.push(['_trackPageview', relativeUrl]);
					}

					// Inform ReInvigorate of a state change
					if ( typeof window.reinvigorate !== 'undefined' && typeof window.reinvigorate.ajax_track !== 'undefined' ) {
						reinvigorate.ajax_track(url);
						// ^ we use the full url here as that is what reinvigorate supports
					}
				},
				error: function(jqXHR, textStatus, errorThrown){
					document.location.href = url;
					return false;
				}
			}); // end ajax

		}); // end onStateChange

	}); // end onDomLoad

})(window); // end closure