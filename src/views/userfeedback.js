import jQuery from 'jquery';
const $ = jQuery;

export default class UserFeedback {
    constructor($parent) {
        var myself = this;

        this.userFeedback = $('<div class="igv-user-feedback">');
        $parent.append(this.userFeedback[0]);

        // header
        this.userFeedbackHeader = $('<div>');
        this.userFeedback.append(this.userFeedbackHeader[0]);

        // alert
        this.userFeedbackAlert = $('<i class="fa fa-exclamation-triangle">');
        this.userFeedbackHeader.append(this.userFeedbackAlert[0]);

        // dismiss
        this.userFeedbackDismiss = $('<i class="fa fa-times-circle">');
        this.userFeedbackHeader.append(this.userFeedbackDismiss[0]);

        this.userFeedbackDismiss.click(function () {
            myself.userFeedbackBodyCopy.html("");
            myself.userFeedback.hide();
        });

        // copy
        this.userFeedbackBodyCopy = $('<div>');
        this.userFeedback.append(this.userFeedbackBodyCopy[0]);

    };

    show() {
        this.userFeedback.show();
    };

    hide() {
        this.userFeedback.hide();
    };

    bodyCopy(htmlString) {
        this.userFeedbackBodyCopy.html(htmlString);
    };

}