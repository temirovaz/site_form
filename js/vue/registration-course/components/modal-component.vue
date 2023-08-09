<template>
  <div>

    <transition name="modal">
      <div class="modal fade in" tabindex="-1" role="dialog" style="display: block;">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-label="Close" @click="$emit('close')"><span aria-hidden="true">&times;</span></button>
              <h4 class="modal-title">
                <slot name="modal-title"></slot>
              </h4>
            </div>
            <div class="modal-body">
              <slot name="modal-body"></slot>
            </div>
            <div class="modal-footer">
              <slot name="modal-footer"></slot>
            </div>
          </div><!-- /.modal-content -->
        </div><!-- /.modal-dialog -->
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  props: [],
  name: "TextInput",
}
</script>

