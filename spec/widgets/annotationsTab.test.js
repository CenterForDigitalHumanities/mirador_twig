describe('AnnotationsTab', function() {
<<<<<<< HEAD
=======
  var subject;
<<<<<<< HEAD
>>>>>>> refs/remotes/upstream/develop
=======
>>>>>>> refs/remotes/upstream/develop

  beforeEach(function() {

  });

  afterEach(function() {

  });

  xdescribe('Initialization', function() {
    it('should initialize', function() {

    });
  });

  xdescribe('localState', function() {

  });

<<<<<<< HEAD
  xdescribe('loadTabComponents', function() {

=======
  describe('annotationListLoaded', function() {
    beforeEach(function() {
      subject.state = {
        getWindowAnnotationsList: jasmine.createSpy('getWindowAnnotationsList').and.returnValue([
          { endpoint: 'dummy' },
          { endpoint: 'dummyUrl' },
          { endpoint: { name: 'endpointName' }}
        ])
      };
    });
    it('should correctly set local state', function() {
      subject.annotationListLoaded();
      expect(subject.localState().annotationLists[0]).toEqual(jasmine.objectContaining({ selected: false }));
      // expect(subject.localState().annotationLists[1]).toEqual(jasmine.objectContaining({ selected: false }));
    });
>>>>>>> refs/remotes/upstream/develop
  });

  xdescribe('tabStateUpdated', function() {

  });

  xdescribe('annotationListLoaded', function() {

  });

  xdescribe('deselectList', function() {

  });

  xdescribe('selectList', function() {

  });

  xdescribe('focusList', function() {

  });

  xdescribe('toggle', function() {

  });

<<<<<<< HEAD
  xdescribe('listenForActions', function() {

  });

  xdescribe('bindEvents', function() {

=======
  describe('listenForActions', function() {
    it('should run tabStateUpdated upon getting a tabStateUpdated event', function() {
      var data = {
        selectedTabIndex: 0,
        tabs: [
          {
            options: {
              id: 'annotationsTab'
            }
          },
          {
            options: {
              id: 'someOtherTab'
            }
          }
        ]
      };
      spyOn(subject, 'tabStateUpdated');
      subject.eventEmitter.publish('tabStateUpdated.' + this.windowId, data);
      expect(subject.tabStateUpdated).toHaveBeenCalledWith(true);
    });
    it('should rerender upon getting a annotationsTabStateUpdated event', function() {
      var data = { visible: false };
      spyOn(subject, 'render');
      subject.eventEmitter.publish('annotationsTabStateUpdated.' + this.windowId, data);
      expect(subject.render).toHaveBeenCalledWith(data);
    })
    it('should run annotationListLoaded upon getting an annotationListLoaded event', function() {
      spyOn(subject, 'annotationListLoaded');
      subject.eventEmitter.publish('annotationListLoaded.' + this.windowId, {});
      expect(subject.annotationListLoaded).toHaveBeenCalled();
    });
    it('should run selectList upon getting a currentCanvasIDUpdated or listSelected event', function() {
      spyOn(subject, 'selectList');
      jQuery.each(['currentCanvasIDUpdated.', 'listSelected.'], function(_, ev) {
        subject.eventEmitter.publish(ev + subject.windowId, {});
        expect(subject.selectList).toHaveBeenCalled();
        subject.selectList.calls.reset();
      });
    });
    it('should run deselectList upon getting a listDeselected event', function() {
      spyOn(subject, 'deselectList');
      subject.eventEmitter.publish('listDeselected.' + this.windowId, 'sampleListId');
      expect(subject.deselectList).toHaveBeenCalledWith('sampleListId');
    });
  });

  describe('bindEvents', function() {
    beforeEach(function() {
      $('<span class="annotationListItem">waahoo1</span>').data('id', 'glub1').appendTo(subject.element);
      $('<span class="annotationListItem">waahoo2</span>').data('id', 'glub2').appendTo(subject.element);
      spyOn(this.eventEmitter, 'publish');
      subject.bindEvents();
    });
    // it('should deselect a selected item when re-clicked', function() {
    //   subject.localState({ selectedList: 'glub1' });
    //   subject.element.find('.annotationListItem').first().click();
    //   expect(this.eventEmitter.publish).toHaveBeenCalledWith('listDeselected.' + this.windowId, 'glub1');
    // });
    // it('should select an unselected item when clicked', function() {
    //   subject.localState({ selectedList: 'glub2' });
    //   subject.element.find('.annotationListItem').first().click();
    //   expect(this.eventEmitter.publish).toHaveBeenCalledWith('listSelected.' + this.windowId, 'glub1');
    // });
<<<<<<< HEAD
>>>>>>> refs/remotes/upstream/develop
=======
>>>>>>> refs/remotes/upstream/develop
  });

  xdescribe('render', function() {

  });
});
