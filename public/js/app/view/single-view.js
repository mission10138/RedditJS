define([
		'underscore', 'backbone', 'resthub', 'hbs!template/single', 'view/post-row-view', 'view/sidebar-view', 'view/comment-view', 'view/base-view', 'model/single', 'event/channel', 'cookie'
	],
	function(_, Backbone, Resthub, singleTmpl, PostRowView, SidebarView, CommentView, BaseView, SingleModel, channel, Cookie) {
		var SingleView = BaseView.extend({

			el: $(".content"),
			template: singleTmpl,
			events: function() {
				var _events = {
					'click #retry': 'tryAgain',
					'click .expando-button': 'toggleExpando'

				};
				_events['click #report' + this.options.id] = "reportShow";
				_events['click #reportConfirmYes' + this.options.id] = "reportYes"; //user clicks yes to report 
				_events['click #reportConfirmNo' + this.options.id] = "reportShow"; //user decides not to report this link/comment

				_events['click #hide' + this.options.id] = "hidePost"; //user wants to hide this post
				_events['click #save' + this.options.id] = "savePost"; //user wants to hide this post
				_events['click #unsave' + this.options.id] = "unSavePost"; //user wants to hide this post

				_events['click .upArrow' + this.options.id] = "upvote";
				_events['click .downArrow' + this.options.id] = "downvote";

				//events moved from the 'comments-view.js'
				_events['click #report' + this.options.id] = "reportShow";
				_events['click #reportConfirmYes' + this.options.id] = "reportYes"; //user clicks yes to report 
				_events['click #reportConfirmNo' + this.options.id] = "reportShow"; //user decides not to report this link/comment

				_events['submit #comment' + this.options.id] = "comment";
				//_events['click .comment' + this.options.name] = "comment";
				//_events['click .MOAR' + this.options.id] = "loadMOAR";
				_events['click #mdHelpShow' + this.options.id] = "showMdHelp";
				_events['click #mdHelpHide' + this.options.id] = "hideMdHelp";

				return _events;
			},

			initialize: function(options) {
				_.bindAll(this);

				$(this.el).html('')
				this.scrollTop()
				var self = this;
				this.subName = options.subName
				this.id = options.id
				this.commentLink = options.commentLink
				this.template = singleTmpl;
				this.hasRendered = false
				this.triggerID()

				if (typeof window.curModel === 'undefined') {
					this.fetchComments(this.loaded)

				} else {
					//console.log('loading a model from memory')
					//this is what we do when we pass in a model with out the comments
					this.model = window.curModel;
					this.updatePageTitle(this.model.get('title'));
					delete window.curModel; //memory management
					this.renderStuff(this.model);
					//well now we need to get the comments for this post!
					this.fetchComments(this.loadComments)

				}

				$(window).resize(this.debouncer(function(e) {
					self.resize()
				}));
				channel.on("single:remove", this.remove, this);
				channel.on("single:giveBtnBarID", this.triggerID, this);

			},
			remove: function() {
				//$(window).unbind('keydown', this.keyPress);
				$(window).off('resize', this.debouncer);
				channel.off("single:remove", this.remove, this);
				channel.off("single:giveBtnBarID", this.triggerID, this);
				this.undelegateEvents();
				this.$el.empty();
				this.stopListening();
				if (typeof this.fetchXhr !== 'undefined' && this.fetchXhr.readyState > 0 && this.fetchXhr.readyState < 4) {
					this.fetchXhr.abort();
				}
				this.fetchXhr.abort()
				console.log('**********************removed the single view *********************************')

				//call the superclass remove method
				//Backbone.View.prototype.remove.apply(this, arguments);
			},
			addOutboundLink: function() {
				this.$('.usertext-body a').addClass('outBoundLink').attr("data-bypass", "true"); //makes the link external to be clickable
				this.$('.usertext-body a').attr('target', '_blank');
			},
			updatePageTitle: function(title) {
				document.title = title + "- RedditJS Beta"
			},

			fetchComments: function(callback) {
				this.$el.append("<div class='loadingS' style='position:relative;left:30%;'></div>")
				this.comments = new SingleModel({
					subName: this.subName,
					id: this.id,
					parseNow: true
				});

				//this.render();
				this.fetchXhr = this.comments.fetch({
					success: callback,
					error: this.fetchError
				});

				console.log('this.id in single', this.id)

				if (this.commentLink !== null) {
					this.loadLinkedComment()
				}

			},
			//this function displays a single comment if the user is viewing a linked comment via the permalink feature
			loadLinkedComment: function() {

				//$(this.el).html("<div class='loadingS'></div>")
				var self = this
				var link_id = 't3_' + this.id
				var params = {
					link_id: link_id,
					id: this.commentLink,
					api_type: 'json',

					//children: this.model.get('children').join(","),
					children: this.commentLink,
					byPassAuth: true
				};

				this.api("api/morechildren.json", 'POST', params, function(data) {
					if (typeof data !== 'undefined' && typeof data.json !== 'undefined' && typeof data.json.data !== 'undefined' && typeof data.json.data.things !== 'undefined') {

						require(['model/comment'], function(CommentModel) {
							data.children = data.json.data.things
							var tmpModel = new CommentModel({
								skipParse: true
							})
							self.linkedCommentModel = tmpModel.parseComments(data, link_id)
							self.linkedCommentModel = self.linkedCommentModel.models[0]

							self.linkedCommentModel.set('permalink', document.URL)

							if (self.hasRendered === true) {
								self.loadLinkedCommentView()
							}

						})

					}
				});

			},

			/**************UI functions ****************/
			resize: function() {
				var mobileWidth = 1000; //when to change to mobile CSS
				//change css of 

				var docWidth = $(document).width()
				var newWidth = 0;
				if (docWidth > mobileWidth) {
					//if the website is in responsive mode
					newWidth = docWidth - 522;
				} else {
					newWidth = docWidth - 222;
				}
				$('#dynamicWidth').html('<style> .embed img { max-width: ' + newWidth + 'px };   </style>');

			},
			toggleExpando: function() {
				if ($('.expando-button').hasClass('expanded')) {
					$('.expando-button').removeClass('expanded')
					$('.expando-button').addClass('collapsed')
					$('.expando').hide()
				} else {
					$('.expando-button').removeClass('collapsed')
					$('.expando-button').addClass('expanded')
					$('.expando').show()
				}
			},
			triggerID: function() {
				channel.trigger("bottombar:selected", "t3_" + this.id);
				//channel.trigger("bottombar:selected", this.model);
			},

			/**************Fetching functions ****************/
			fetchError: function(response, error) {
				console.log("fetch error, lets retry")

				$(this.el).html("<div id='retry' >  <div class='loading'></div> </div> ")

			},
			tryAgain: function() {
				$(this.el).append("<style id='dynamicWidth'> </style>")
				$(this.el).html("<div id='retry' >  <img src='img/sad-icon.png' /><br /> click here to try again </div> ")
				this.model.fetch({
					success: this.loaded,
					error: this.fetchError
				});
			},
			fetchMore: function() {

			},
			renderStuff: function(model) {
				//console.log('rendering single=', this.model)
				this.render()
				this.hasRendered = true
				this.addOutboundLink()
				this.loadLinkedCommentView()
				$(this.el).append("<style id='dynamicWidth'> </style>")
				this.resize()

			},
			loadLinkedCommentView: function() {
				if (typeof this.linkedCommentModel !== 'undefined') {
					console.log('loading linked comment view')
					//this.linkedCommentView.render()
					var comment = new CommentView({
						model: this.linkedCommentModel,
						id: this.linkedCommentModel.get('id'),
						root: "#linkedComment"
						//root: "#commentarea"
					})
					this.$('#linkedComment .usertext-body').first().css('background-color', '#F5F5A7')

				}
			},
			//if we dont pass in a model we need to render the comments here
			loadComments: function(model, res) {
				this.$('.loadingS').remove()
				this.permalinkParent = this.model.get('permalink') //this is for the comment callback so we can set the permalink after someone comments on a main post

				this.renderComments(model.get('replies'))

			},
			loaded: function(model, res) {
				//this.$('.loading').hide()
				this.model = model

				//this.model = model.parseOnce(model.attributes)
				this.renderStuff(model);
				this.loadComments(model)
				//console.log('before activiating btm bar=', model)

			},
			renderComments: function(collection) {
				//console.log('collection in renderComments', collection)
				var self = this
				this.updatePageTitle(this.model.get('title'))
				collection.each(function(model) {
					//console.log('model in renderComments', model)
					model.set('permalink', self.model.get('permalink') + model.get('id'))
					model.set('permalinkParent', self.model.get('permalink'))

					var comment = new CommentView({
						model: model,
						id: model.get('id'),
						strategy: "append",
						root: "#siteTableComments"
						//root: "#commentarea"
					})

				})

			}

		});
		return SingleView;
	});