# -*- coding: utf-8 -*-
from django.core.cache import cache
from django.db.models import F
from django.db.models.signals import (
    pre_delete,
)

from edw.signals import make_dispatch_uid
from edw.signals.mptt import (
    move_to_done,
    pre_save,
    post_save
)

from edw.models.term import TermModel


def get_children_keys(sender, parent_id):
    key = ":".join([
        sender._meta.object_name.lower(),
        sender.CHILDREN_CACHE_KEY_PATTERN.format(parent_id=parent_id)
        if parent_id is not None else
        "toplevel"
    ])
    return [key, ":".join([key, "active"])]


#==============================================================================
# Term model event handlers
#==============================================================================
def invalidate_term_before_save(sender, instance, **kwargs):
    if instance.id is not None:
        try:
            original = sender._default_manager.get(pk=instance.id)
            if original.parent_id != instance.parent_id:
                if original.active != instance.active:
                    TermModel.clear_children_buffer()  # Clear children buffer
                else:
                    keys = get_children_keys(sender, original.parent_id)
                    cache.delete_many(keys)
            else:
                if original.active != instance.active:
                    if instance.active:
                        parent_id_list = list(original.get_family().
                                              exclude(lft=F('rght')-1).values_list('id', flat=True))
                        parent_id_list.append(None)
                    else:
                        parent_id_list = list(original.get_descendants(include_self=True).
                                              exclude(lft=F('rght')-1).values_list('id', flat=True))
                        parent_id_list.append(original.parent_id)
                    keys = []
                    for parent_id in parent_id_list:
                        keys.extend(get_children_keys(sender, parent_id))
                    cache.delete_many(keys)
        except sender.DoesNotExist:
            pass


def invalidate_term_after_save(sender, instance, **kwargs):
    if instance.id is not None and not getattr(instance, '_children_buffer_empty', False) :
        keys = get_children_keys(sender, instance.parent_id)
        cache.delete_many(keys)

    TermModel.clear_decompress_buffer()  # Clear decompress buffer


def invalidate_term_after_move(sender, instance, target, position, prev_parent, **kwargs):
    keys = get_children_keys(sender, prev_parent.id if prev_parent is not None else None)
    cache.delete_many(keys)

    invalidate_term_after_save(sender, instance, **kwargs)


pre_save.connect(invalidate_term_before_save, sender=TermModel.materialized,
                 dispatch_uid=make_dispatch_uid(
                     pre_save,
                     invalidate_term_before_save,
                     TermModel
                 ))
post_save.connect(invalidate_term_after_save, sender=TermModel.materialized,
                  dispatch_uid=make_dispatch_uid(
                      post_save,
                      invalidate_term_after_save,
                      TermModel
                  ))
pre_delete.connect(invalidate_term_after_save, sender=TermModel.materialized,
                   dispatch_uid=make_dispatch_uid(
                       pre_delete,
                       invalidate_term_after_save,
                       TermModel
                   ))
move_to_done.connect(invalidate_term_after_move, sender=TermModel.materialized,
                     dispatch_uid=make_dispatch_uid(
                         move_to_done,
                         invalidate_term_after_move,
                         TermModel
                     ))
