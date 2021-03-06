# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.views.generic import DetailView

from sample.models.book import Book


class BookDetailView(DetailView):
    # context_object_name="event"
    template_name="sample/book_detail.html"

    def __init__(self, **kwargs):
        self.model = kwargs.get('model') or Book
        self.queryset = self.model.objects.all()
        super(BookDetailView, self).__init__(**kwargs)

    def get_context_data(self, **kwargs):
        context = {}
        if self.object:
            context.update({
                'title': self.object.entity_name,
            })
        context.update(kwargs)
        return super(BookDetailView, self).get_context_data(**context)
