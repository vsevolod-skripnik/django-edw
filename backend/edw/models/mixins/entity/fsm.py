# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import transaction
from django.utils.encoding import force_text

from edw.models.customer import CustomerModel
from edw.models.mixins.entity import get_or_create_model_class_wrapper_term, ENTITY_CLASS_WRAPPER_TERM_SLUG_PATTERN
from edw.models.term import TermModel

_default_system_flags_restriction = (TermModel.system_flags.delete_restriction |
                                     TermModel.system_flags.change_parent_restriction |
                                     TermModel.system_flags.change_slug_restriction |
                                     TermModel.system_flags.change_semantic_rule_restriction |
                                     TermModel.system_flags.has_child_restriction |
                                     TermModel.system_flags.external_tagging_restriction)


class FSMMixin(object):
    """
    RUS: Добавляет Состояние в модель, автоматически обновляет Состояние при изменении статуса.
    """

    REQUIRED_FIELDS = ('status',)

    STATE_ROOT_TERM_SLUG = "state"

    '''
    Example:
    TRANSITION_TARGETS = {
        'new': "Default state",
        ...
    }
    '''
    TRANSITION_TARGETS = {}

    @classmethod
    def get_transition_name(cls, target):
        """
        ENG: Return the human readable name for a given transition target.
        RUS: Возвращает удобочитаемое имя для данного целевого объекта перехода.
        """
        return target

    def get_email_recipients(self, notification_recipient):
        """
        RUS: Отправляет уведомление получателям на электронную почту.
        """
        if notification_recipient is None or not hasattr(self, 'customer') or getattr(self, 'customer') is None:
            return []
        if notification_recipient == 0:
            customer = getattr(self, 'customer')
            return [customer.email]
        return [CustomerModel.objects.get(pk=notification_recipient).email]

    def get_push_recipients(self, notification_recipient):
        """
        RUS: Отправляет PUSH уведомление получателям.
        """
        return []

    def state_name(self):
        """
        RUS: Возбуждает исключение, когда абстрактные методы класса требуют переопределения в дочерних классах.
        """
        raise NotImplementedError(
            '{cls}.state_name must be implemented.'.format(
                cls=self.__class__.__name__
            )
        )

    @classmethod
    def get_states(cls):
        """
        RUS: Добавляет термин Состояние в модель fsm_model при его отсутствии.
        """
        fsm_model = cls._meta.get_field('status').model
        cache_key = "_{cls}_states_cache".format(cls=fsm_model)
        states = getattr(fsm_model, cache_key, None)
        if states is None:
            model_class_term_slug = ENTITY_CLASS_WRAPPER_TERM_SLUG_PATTERN.format(fsm_model.__name__.lower())
            states = {}
            try:
                root = TermModel.objects.get(
                    slug=fsm_model.STATE_ROOT_TERM_SLUG,
                    parent__slug=model_class_term_slug
                )
                for term in root.get_descendants(include_self=False):
                    states[term.slug] = term
            except TermModel.DoesNotExist:
                pass
            setattr(fsm_model, cache_key, states)
        return states

    @classmethod
    def validate_term_model(cls):
        """
        RUS: Добавляет Состояние родителя и объекта в модель TermModel при их отсутствии и сохраняет их.
        """
        super(FSMMixin, cls).validate_term_model()

        if not cls._meta.abstract and cls._meta.get_field('status').model == cls:
            system_flags = _default_system_flags_restriction

            model_root_term = get_or_create_model_class_wrapper_term(cls)
            with transaction.atomic():
                try:
                    states_parent_term = TermModel.objects.get(slug=cls.STATE_ROOT_TERM_SLUG, parent=model_root_term)
                except TermModel.DoesNotExist:
                    states_parent_term = TermModel(
                        slug=cls.STATE_ROOT_TERM_SLUG,
                        parent_id=model_root_term.id,
                        name=force_text(cls._meta.get_field('status').verbose_name),
                        semantic_rule=TermModel.XOR_RULE,
                        system_flags=system_flags
                    )
                    states_parent_term.save()
            transition_states = cls.TRANSITION_TARGETS
            for state_key, state_name in transition_states.items():
                with transaction.atomic():
                    try:
                        states_parent_term.get_descendants(include_self=False).get(slug=state_key)
                    except TermModel.DoesNotExist:
                        state = TermModel(
                            slug=state_key,
                            parent_id=states_parent_term.id,
                            name=force_text(state_name),
                            semantic_rule=TermModel.OR_RULE,
                            system_flags=system_flags
                        )
                        state.save()

    def need_terms_validation_after_save(self, origin, **kwargs):
        """
        RUS: Автоматически проставляет Состояние в терминах после сохранения объекта.
        """
        if origin is None or origin.status != self.status:
            do_validate = kwargs["context"]["validate_entity_state"] = True
        else:
            do_validate = False
        return super(FSMMixin, self).need_terms_validation_after_save(
            origin, **kwargs) or do_validate

    def validate_terms(self, origin, **kwargs):
        """
        RUS: Обновляет Состояние объекта при его изменении.
        """
        context = kwargs["context"]
        if context.get("force_validate_terms", False) or context.get("validate_entity_state", False):
            states = self.get_states()
            # remove old state term
            self.terms.remove(*[term.id for term in states.values()])
            # add new state term
            new_state = states[self.status]
            self.terms.add(new_state)
        super(FSMMixin, self).validate_terms(origin, **kwargs)
