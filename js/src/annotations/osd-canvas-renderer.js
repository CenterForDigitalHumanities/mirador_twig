(function($) {

  // Takes a list of oa:annotations passed
  // by reference and renders their regions,
  // registering updates.

  $.OsdCanvasRenderer = function(options) {

    jQuery.extend(this, {
      osd:       null,
      osdViewer: null,
      elements:  null,
      list:      null,
      parent:    null, //annotationsLayer
      annoTooltips: {},
      tooltips:  null,
      overlays:  [],
      inEditOrCreateMode:   false
    }, options);

    this.bindEvents();
  };

  $.OsdCanvasRenderer.prototype = {
    parseRegion: function(url) {
      var regionString = "xywh=0,0,0,0";
      var onlyCommenting = false;
      if (typeof url === 'object') {
        if(url.selection.value!==undefined && url.selection.value!==""){
          //A region may not have been provided, this causes the code to crash.  Handle with a 0 height and width anno. 
          regionString = url.selector.value;
        }
        else{
          regionString = "xywh=0,0,0,0";
        }
      } 
      else {
        //BH edit: These could be commenting annotations that were not given a region.  If so, make a fake xywh=0,0,0,0 to represent the commenting annotation on the canvas. 
        if(regionString.indexOf("#") > -1){
          regionString = url.split('#')[1];
        }
        else{
          //Then it does not have a region, it is only commenting.
          onlyCommenting = true;
          regionString = "xywh=0,0,0,0"; //It could be a purely commenting annotation that does not need to be drawn.
        }
        
      }
      var regionArray = regionString.split('=')[1].split(',');
      return regionArray;
    },

    getOsdFrame: function(region) {
      var rectX = region[0],
      rectY = region[1],
      rectW = region[2],
      rectH = region[3];

      return this.osdViewer.viewport.imageToViewportRectangle(rectX,rectY,rectW,rectH);

    },

    render: function() {
      var _this = this;
      _this.hideAll(),
      this.overlays = [];

      var deferreds = jQuery.map(this.list, function(annotation) {
        var deferred = jQuery.Deferred(),
        region = _this.parseRegion(annotation.on),
        osdOverlay = document.createElement('div');
        osdOverlay.className = 'annotation';
        osdOverlay.id = annotation['@id'];
        _this.osdViewer.addHandler("add-overlay", function() {
          deferred.resolve();
        });
        _this.osdViewer.addOverlay({
          element: osdOverlay,
          location: _this.getOsdFrame(region)
        });
        _this.overlays.push(jQuery(osdOverlay));
        return deferred;
      });
      //this still doesn't take into account the actual appending of the overlays to the DOM
      //so not quite there yet
      jQuery.when.apply(jQuery, deferreds).done(function() {
        jQuery.publish('overlaysRendered.' + _this.parent.windowId);        
      });

      this.tooltips = jQuery(this.osdViewer.element).qtip({
            overwrite : false,
            content: {
             text : ''
             },
             position : {
              target : 'mouse',
              my: 'bottom left',
              at: 'top right',
              adjust : {
                mouse: false,
                method: 'shift'
              },
              //when the side panel is active and visible, it messes up the offset for the qtip
              //which means that qtips will disappear for annotations that are on the far right side of the canvas
              //so we need the container and viewport to be the element that encompasses everything,
              //which can be the window or slot.  we need a better way of getting this element
              //because this is brittle
              container: _this.parent.parent.parent.element, //window's element
              viewport: _this.parent.parent.parent.element //window's element
             },
             style : {
              classes : 'qtip-bootstrap qtip-viewer'
             },
             show: {
              delay: 20,
              event: false
             },
             hide: {
                fixed: true,
                delay: 50,
                event: false
             },
             events: {
               show: function(event, api) {
                 _this.setTooltipContent(event, api);               
               },
               visible: function(event, api) {
                 _this.removeAnnotationEvents(event, api);
                 _this.annotationEvents(event, api);
              },
               move: function(event, api) {
                 _this.removeAnnotationEvents(event, api);
                 _this.annotationEvents(event, api);
                 _this.annotationSaveEvent(event, api);
               },
               hidden: function(event, api) {
                 if (jQuery('.qtip:visible').length === 0) {
                  jQuery(_this.osdViewer.canvas).find('.annotation').removeClass('hovered');//.css('border-color', 'deepSkyBlue');
                 }
               }
             }
      });
    },

    setTooltipContent: function(event, api) {
      var overlays = this.getOverlaysFromElement(jQuery(event.originalEvent.currentTarget), event.originalEvent),
      _this = this,
      annoTooltip = new $.AnnotationTooltip({"windowId" : _this.parent.windowId}), //pass permissions
      annotations = [];

      jQuery.each(overlays, function(index, overlay) {
       annotations.push(_this.getAnnoFromRegion(overlay.id)[0]);
     });
      api.set({'content.text' : annoTooltip.getViewer(annotations)});
      jQuery.publish('tooltipViewerSet.'+_this.parent.windowId);
    },

    getAnnoFromRegion: function(regionId) {
      return this.list.filter(function(annotation) {
        return annotation['@id'] === regionId;
      });
    },

    showTooltipsFromMousePosition: function(event) {
      var overlays = this.getOverlaysFromMousePosition(event);
      var api = jQuery(this.osdViewer.element).qtip('api');
      if (api) {
        if (overlays.length === 0) {
          api.hide(event);
        } else if (api.elements.tooltip && api.elements.tooltip.is(':visible')) {
          this.setTooltipContent(event, api);
          api.cache.origin = event;
          api.reposition(event, true);
        } else {
          api.show(event);
        }
      }
    },

    getOverlaysFromMousePosition: function(event) {
      var position = OpenSeadragon.getMousePosition(event);
      var _this = this,
      overlays = jQuery(_this.osdViewer.canvas).find('.annotation').map(function() {
        var self = jQuery(this),
        offset = self.offset(),
        l = offset.left,
        t = offset.top,
        h = self.height(),
        w = self.width(),
        x = position.x,
        y = position.y,
        maxx = l+w,
        maxy = t+h;
        return (y <= maxy && y >= t) && (x <= maxx && x >= l) ? this : null;
      });
      return overlays;
    },
    getOverlaysFromElement: function(element, event) {
      var _this = this,
      overlays = this.getOverlaysFromMousePosition(event);
      jQuery(_this.osdViewer.canvas).find('.annotation.hovered').removeClass('hovered');//.css('border-color', 'deepSkyBlue');
      overlays.addClass('hovered');
      /*jQuery.each(overlays, function(index, value) {
       jQuery(value).css('border-color', _this.getRandomColor());
      });*/
      return overlays;
    },

    getRandomColor: function() {
       var colors = this.hsvToRgb(Math.random() * 360, 50, 100);
       //return "#" + Math.floor(Math.random() * 0xFFFFFF).toString(16);
       return 'rgb('+colors[0]+','+colors[1]+','+colors[2]+')';
    },

    /**
    * From: http://snipplr.com/view.php?codeview&id=14590
    * HSV to RGB color conversion
    *
    * H runs from 0 to 360 degrees
    * S and V run from 0 to 100
    * 
    * Ported from the excellent java algorithm by Eugene Vishnevsky at:
    * http://www.cs.rit.edu/~ncs/color/t_convert.html
    */
    hsvToRgb: function(h, s, v) {
      var r, g, b;
      var i;
      var f, p, q, t;

      // Make sure our arguments stay in-range
      h = Math.max(0, Math.min(360, h));
      s = Math.max(0, Math.min(100, s));
      v = Math.max(0, Math.min(100, v));

      // We accept saturation and value arguments from 0 to 100 because that's
      // how Photoshop represents those values. Internally, however, the
      // saturation and value are calculated from a range of 0 to 1. We make
      // That conversion here.
      s /= 100;
      v /= 100;

      if(s === 0) {
        // Achromatic (grey)
        r = g = b = v;
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      h /= 60; // sector 0 to 5
      i = Math.floor(h);
      f = h - i; // factorial part of h
      p = v * (1 - s);
      q = v * (1 - s * f);
      t = v * (1 - s * (1 - f));

      switch(i) {
       case 0:
      r = v;
      g = t;
      b = p;
      break;

    case 1:
      r = q;
      g = v;
      b = p;
      break;

    case 2:
      r = p;
      g = v;
      b = t;
      break;

    case 3:
      r = p;
      g = q;
      b = v;
      break;
      
    case 4:
      r = t;
      g = p;
      b = v;
      break;
      
    default: // case 5:
      r = v;
      g = p;
      b = q;
     }

     return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    bindEvents: function() {
      var _this = this;

      jQuery(this.osdViewer.canvas).parent().on('mousemove', $.throttle(function(event) { 
        if (!_this.inEditOrCreateMode) {
          _this.showTooltipsFromMousePosition(event);
        }
       }, 200, true));

     this.osdViewer.addHandler('zoom', $.debounce(function(){
          _this.hideVisibleTooltips();
        }, 200, true));

      jQuery.subscribe('removeTooltips.' + _this.parent.windowId, function() {
        jQuery(_this.osdViewer.canvas).find('.annotation').qtip('destroy', true);
      });

      jQuery.subscribe('disableTooltips.' + _this.parent.windowId, function() {
        _this.inEditOrCreateMode = true;
      });

      jQuery.subscribe('enableTooltips.' + _this.parent.windowId, function() {
        _this.inEditOrCreateMode = false;
      });

      jQuery.subscribe('removeOverlay.' + _this.parent.windowId, function(event, annoId) {
        //remove this annotation's overlay from osd
        _this.osdViewer.removeOverlay(jQuery(_this.osdViewer.element).find(".annotation#"+annoId)[0]);
      });

    },

    hideVisibleTooltips: function() {
      jQuery('.qtip-viewer').qtip('hide');
    },

    update: function() {
      this.render();
    },

    hideAll: function() {
      this.osdViewer.clearOverlays();
    },

    getElements: function() {
      this.elements = this.osdViewer.currentOverlays.reduce(function(result, currentOverlay) {
        currentOverlay = jQuery(currentOverlay);
        return result.add(currentOverlay);
      });
      return elements;
    },

    //change content of this tooltip, and disable hiding it, until user clicks save or cancel
    //disable all other qtips until editing this is done
    freezeQtip: function(api, oaAnno, annoTooltip) {
      this.inEditOrCreateMode = true;
      jQuery.publish('disableRectTool.'+this.parent.windowId);
        api.set({'content.text' : annoTooltip.getEditor(oaAnno),
        'hide.event' : false});
        jQuery.publish('annotationEditorAvailable.'+this.parent.windowId);
        //add rich text editor
        tinymce.init({
                  selector : 'form.annotation-tooltip textarea',
                  plugins: "image link media",
                  menubar: false,
                  statusbar: false,
                  toolbar_items_size: 'small',
                  toolbar: "bold italic | bullist numlist | link image media | removeformat",
                  setup : function(editor) {
                    editor.on('init', function(args) {
                      tinymce.execCommand('mceFocus', false, args.target.id); //make sure tinymce focuses on the editor after initialization                    
                    });
                  }
                });
        jQuery(api.elements.tooltip).removeClass("qtip-viewer"); //so it is not affected by zoom event raised in OSD
        this.osdViewer.zoomPerClick = 1;
        this.osdViewer.zoomPerScroll = 1;
    },
    
    //reenable all other qtips
    //update content of this qtip to make it a viewer, not editor
    //and reset hide event       
    unFreezeQtip: function(api, oaAnno, annoTooltip) {
      this.inEditOrCreateMode = false;
      jQuery.publish('enableRectTool.'+this.parent.windowId);
      api.set({'content.text' : annoTooltip.getViewer([oaAnno]),
          'hide.event' : 'mouseleave'}).hide();
      jQuery(api.elements.tooltip).addClass("qtip-viewer"); //re-add class so it is affected by zoom event raised in OSD
      this.osdViewer.zoomPerClick = 2;
      this.osdViewer.zoomPerScroll = 1.2;
    },
    
    removeAnnotationEvents: function(tooltipevent, api) {
      var _this = this,
      editorSelector = '#annotation-editor-'+_this.parent.windowId,
      viewerSelector = '#annotation-viewer-'+_this.parent.windowId;
      jQuery(viewerSelector+' a.delete').off("click");
      jQuery(viewerSelector+' a.edit').off("click");
      jQuery(editorSelector+' a.save').off("click");
      jQuery(editorSelector+' a.cancel').off("click");
    },

    annotationEvents: function(tooltipevent, api) {
      var _this = this,
      annoTooltip = new $.AnnotationTooltip({"windowId" : _this.parent.windowId}),
      selector = '#annotation-viewer-'+_this.parent.windowId;
      jQuery(selector+' a.delete').on("click", function(event) {
        event.preventDefault();
        
        if (!window.confirm("Do you want to delete this annotation?")) { 
          return false;
        }

        var display = jQuery(this).parents('.annotation-display'),
        id = display.attr('data-anno-id');
        //oaAnno = _this.getAnnoFromRegion(id)[0];
        jQuery.publish('annotationDeleted.'+_this.parent.windowId, [id]);
        
        //hide tooltip so event handlers don't get messed up
        api.hide();
        display.remove(); //remove this annotation display from dom
      });

      jQuery(selector+' a.edit').on("click", function(event) {
        event.preventDefault();
        
        var display = jQuery(this).parents('.annotation-display'),
        id = display.attr('data-anno-id'),
        oaAnno = _this.getAnnoFromRegion(id)[0];
       
        _this.freezeQtip(api, oaAnno, annoTooltip);
      });
    },
    
    annotationSaveEvent: function(event, api) {
      var _this = this,
      annoTooltip = new $.AnnotationTooltip({"windowId" : _this.parent.windowId}),
      selector = '#annotation-editor-'+_this.parent.windowId;
      
      jQuery(selector).on("submit", function(event) {
        event.preventDefault();
        jQuery(selector+' a.save').click();
      });

      jQuery(selector+' a.save').on("click", function(event) {
        event.preventDefault();
                  
        var display = jQuery(this).parents('.annotation-tooltip'),
        id = display.attr('data-anno-id'),
        oaAnno = _this.getAnnoFromRegion(id)[0];
                  
        //check if new resourceText is empty??
        var tagText = jQuery(this).parents('.annotation-editor').find('.tags-editor').val(),
        resourceText = tinymce.activeEditor.getContent(),
        tags = [];
        tagText = $.trimString(tagText);
        if (tagText) {
            tags = tagText.split(/\s+/);
        }

        var bounds = _this.osdViewer.viewport.getBounds(true);
        // var scope = _this.osdViewer.viewport.viewportToImageRectangle(bounds);
        //bounds is giving negative values?
        //update scope
        // oaAnno.on.scope.value = "xywh="+Math.round(scope.x)+","+Math.round(scope.y)+","+Math.round(scope.width)+","+Math.round(scope.height); //osd bounds
                  
        var motivation = [],
        resource = [];
                  
        //remove all tag-related content in annotation
        oaAnno.motivation = jQuery.grep(oaAnno.motivation, function(value) {
            return value !== "oa:tagging";
        });
        oaAnno.resource = jQuery.grep(oaAnno.resource, function(value) {
            return value["@type"] !== "oa:Tag";
        });
        //re-add tagging if we have them
        if (tags.length > 0) {
            oaAnno.motivation.push("oa:tagging");
            jQuery.each(tags, function(index, value) {
                oaAnno.resource.push({      
                    "@type":"oa:Tag",
                     "chars":value
                });
            });
        }
        jQuery.each(oaAnno.resource, function(index, value) {
            if (value["@type"] === "dctypes:Text") {
                value.chars = resourceText;
            }
        });
        //save to endpoint
        jQuery.publish('annotationUpdated.'+_this.parent.windowId, [oaAnno]);

        _this.unFreezeQtip(api, oaAnno, annoTooltip);
        });
        
        jQuery(selector+' a.cancel').on("click", function(event) {
          event.preventDefault();
          var display = jQuery(this).parents('.annotation-tooltip'),
          id = display.attr('data-anno-id'),
          oaAnno = _this.getAnnoFromRegion(id)[0];
   
        _this.unFreezeQtip(api, oaAnno, annoTooltip);
        });

    }
  };
})(Mirador);
