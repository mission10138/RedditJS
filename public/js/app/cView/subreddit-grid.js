define(['App', 'marionette', 'view/post-row-grid-view'],
  function(App, Marionette, PostRowGridView) {
    return Backbone.Marionette.CollectionView.extend({
      childView: PostRowGridView,
      id: 'colContainer',
      initialize: function(options) {
        var self = this
        App.gridImagesLoadingCount = 0 //keeps track of how many images we load at once
        this.cols = []
      },
      onRender: function() {
        this.gridViewSetup()

        //test if all posts in collection are non-image posts
        this.testNonImg()
      },

      childViewOptions: function() {
        return {
          cols: this.cols
        }
      },

      onBeforeClose: function() {

      },

      testNonImg: function() {
        var self = this
        setTimeout(function() {
          if (((self.collection.length - self.collection.countNonImg) < 2) && App.settings.get('hideSelf') === true) {
            self.noImgsFound()
          }
        }, 5000)

      },
      //display all self posts and links if no imgs found
      noImgsFound: function() {

        $('#siteTableContainer').append('<div id="noImgsMsg"> No images found in this subreddit, change to another view. </div>');
        //App.trigger('showNonImgs')

      },
      gridViewSetup: function() {
        //calculate how many columns we will have
        var colCount = Math.floor($(document).width() / 305)
        if (App.isMobile() === true) {
          var fakeMobileWidth = $(document).width()
          if (fakeMobileWidth < 550) {
            fakeMobileWidth = 550
          }
          colCount = Math.floor(fakeMobileWidth / 249)
        }
        for (var i = 0; i < colCount; i++) {

          var col = document.createElement('div');
          col.className = 'column';
          this.el.appendChild(col)

          this.cols.push(col) //save ref for child views to have quick access to the columns
        }

        $('.side').hide() //Also handling the display or hide of sidebar within sidebar view, need this here for when grid option is on pageload

        this.$el.css('margin-right', '0') //some custom CSS was making this bad in grid mode
        this.$el.css('text-align', 'center')
      }
    });
  });
