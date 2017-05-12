#-*- coding: utf-8 -*-
from __future__ import unicode_literals

from django import forms
from django.utils.translation import ugettext_lazy as _
from django.contrib import admin

from salmonella.widgets import SalmonellaIdWidget

from edw.models.term import BaseTerm, TermModel
from edw.models.entity import EntityModel
from edw.models.data_mart import DataMartModel
from edw.models.related import (
    EntityRelationModel,
    EntityRelatedDataMartModel
)

from edw.admin.term.widgets import TermTreeWidget
from edw.admin.mptt.fields import FullPathTreeNodeChoiceField


#==============================================================================
# EntityAdminForm
#==============================================================================
class EntityAdminForm(forms.ModelForm):

    terms = forms.ModelMultipleChoiceField(queryset=TermModel.objects.all().exclude(
        system_flags=BaseTerm.system_flags.external_tagging_restriction),
        required=False, widget=TermTreeWidget(external_tagging_restriction=True, fix_it=False), label=_("Terms"))


#==============================================================================
# EntityCharacteristicOrMarkInlineForm
#==============================================================================
class EntityCharacteristicOrMarkInlineForm(forms.ModelForm):

    term = FullPathTreeNodeChoiceField(queryset=TermModel.objects.attribute_is_characteristic_or_mark(),
                                       joiner=' / ', label=_('Characteristic or mark'))


#==============================================================================
# EntityRelationInlineForm
#==============================================================================
class EntityRelationInlineForm(forms.ModelForm):

    term = FullPathTreeNodeChoiceField(queryset=TermModel.objects.attribute_is_relation(),
                                       joiner=' / ', label=_('Relation'))

    to_entity = forms.ModelChoiceField(queryset=EntityModel.objects.all(), label=_('Target'),
                                       widget=SalmonellaIdWidget(
                                           EntityRelationModel._meta.get_field("to_entity").rel, admin.site))


#==============================================================================
# EntityRelatedDataMartInlineForm
#==============================================================================
class EntityRelatedDataMartInlineForm(forms.ModelForm):
    data_mart = forms.ModelChoiceField(queryset=DataMartModel.objects.all(), label=_('Data mart'),
                                       widget=SalmonellaIdWidget(
                                           EntityRelatedDataMartModel._meta.get_field("data_mart").rel, admin.site))


#==============================================================================
# EntitiesUpdateTermsAdminForm
#==============================================================================
class EntitiesUpdateTermsAdminForm(forms.Form):
    to_set = forms.ModelMultipleChoiceField(queryset=TermModel.objects.all(), required=False, label=_("Terms to set"),
                                            widget=TermTreeWidget(external_tagging_restriction=True, fix_it=False))
    to_unset = forms.ModelMultipleChoiceField(queryset=TermModel.objects.all(), required=False, label=_("Terms to unset"),
                                              widget=TermTreeWidget(external_tagging_restriction=True, fix_it=False))



#==============================================================================
# EntitiesUpdateRelationAdminForm
#==============================================================================
class EntitiesUpdateRelationAdminForm(forms.Form):

    term = FullPathTreeNodeChoiceField(queryset=TermModel.objects.attribute_is_relation(),
                                       joiner=' / ', label=_('Relation'))

    to_set_to_entity = forms.ModelChoiceField(queryset=EntityModel.objects.all(), label=_('Target to set'),
                                              required=False, widget=SalmonellaIdWidget(
            EntityRelationModel._meta.get_field("to_entity").rel, admin.site))

    to_unset_to_entity = forms.ModelChoiceField(queryset=EntityModel.objects.all(), label=_('Target to unset'),
                                                required=False, widget=SalmonellaIdWidget(
            EntityRelationModel._meta.get_field("to_entity").rel, admin.site))