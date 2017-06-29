/* Events */

/* show/hide menu */
configBtn.click(function() {
    $('body').toggleClass('config-active');
});

$body.on('click', '.b-header__menu', function() {
    var $this = $(this);
    if($this.hasClass('pushed')) {
        $this.removeClass('pushed');
        addContent();
    } else {
        $this.addClass('pushed');
        previousConfigAmount = configAmount;
    }

});
/* change button view from unpushed to pushed */
$body.on('click', '.b-header__play, .b-header__pause', function() {
    $(this).addClass('pushed');
});
/* run upvote processing available */
$body.on('click', '.b-header__play', function() {
    var $this = $(this);
    var index = $this.data('index');

    if(typeof index == 'number') {
        var currentVars = vars[index];
        var elems = currentVars['elems'];
        var userName = currentVars['me'] = getFromLs('config_user')[index];

        currentVars['isBotRun'] = true;

        elems['progressBarEl'].removeClass('stop');
        $('.b-header__pause[data-index="'+index+'"]').removeClass('pushed');

        currentVars['curators'] = getFromLs('config_cu')[userName].split(', ');
        currentVars['wif'] = getFromLs('config_wif')[userName];
        currentVars['votePower'] = getFromLs('config_vp')[userName] * 100;

        elems['curatorsEl'].html(curatorItemTmpl.tmpl({
            curators: vars[index]['curators']
        }));

        elems['totalEl'].text(vars[index]['progress']['total']);
        elems['votesEl'].text(vars[index]['progress']['votes']);
        elems['unVotesEl'].text(vars[index]['progress']['unvotes']);
        elems['progressLabelEl'].text('Работает...');

        currentVars['isReadyForAnalyze'] = true;
    }
});
/* stop the upvote process*/
$body.on('click', '.b-header__pause', function() {
    var index = $(this).data('index');
    var elems = vars[index]['elems'];
    vars[index]['isBotRun'] = false;
    elems['progressBarEl'].addClass('stop');
    elems['progressLabelEl'].text('Остановлен...')
    $('.b-header__play[data-index="'+index+'"]').removeClass('pushed');
    $('#'+vars[index]['me']).removeClass('need-rerun');
});
/* show posting key */
$body.on('mousedown touchstart', '.js-show-wif', function() {
    var $this = $(this);
    var id = $this.data('inputIndex');
    var content = $('[data-index="'+id+'"]');
    var contentToSHow = content.data('showContent');
    content.val(contentToSHow);
    content.text(contentToSHow);
});
/* hide posting key */
$body.on('mouseup touchend', '.js-show-wif', function() {
    var $this = $(this);
    var id = $this.data('inputIndex');
    var content = $('[data-index="'+id+'"]');
    var contentToSHow = content.data('hideContent');
    content.val(contentToSHow);
    content.text(contentToSHow);
});
/* run functionality on inputs blur to check if they were changed */
$body.on('blur', '.b-config-input', function() {
    var $this = $(this);
    var fieldName = $this.data('name');
    var userName = $this.data('user');
    var previousValue = $this.data('previousValue');
    var index = typeof $this.data('index') == 'number' ? $this.data('index') : $this.data('index').replace('wif','');
    var value = $.trim($this.val());

    if(previousValue && previousValue != value) {
        $('#'+userName).addClass('need-rerun');
        $this.data('previousValue', value);

        saveFiledsValues($this, userName, fieldName, value, index);
    }

    if(!previousValue) {
        $this.data('previousValue', value);
    }

});
/* user name field. Check if user exist*/
$body.on('input', '.b-config-input-userName', function() {
    var $this = $(this);
    var index = $this.data('index');
    var value = $.trim($this.val());
    var form = $this.closest('.b-config__form');

    if(value.length > 2) {
        steem.api.getAccounts([value], function(err, result) {
            if(result && result[0] && result[0].id){
                enableFields(form);
            } else {
                disableFields(form);
            }
        });
    }

    if(!value) {
        disableFields(form);
    }
});
/* delete user */
$body.on('click', '.b-delete', function() {
    var $this = $(this);
    var index = $this.data('index');
    var userName = $this.data('user');
    var currentVar = vars[index];
    var newConfigAmount;
    var newUser = [];
    var newConfigCu = {};
    var newConfigVp = {};
    var newConfigWif = {};
    var lsConfigUser = getFromLs('config_user');
    var lsConfigCu = getFromLs('config_cu');
    var lsConfigVp = getFromLs('config_vp');
    var lsConfigWif = getFromLs('config_wif');

    // real time ignore
    if(userName) {
        if(currentVar && !currentVar['wasDelete']) {
            currentVar['wasDelete'] = true;
        }

        //html delete
        $('#config-form-'+index).remove();
        $($('a[href="#'+userName+'"]')).parent().remove();
        $('#'+userName).remove();

        // localStorage delete
        newConfigAmount = configAmount = getFromLs('config_amount') - 1;

        lsConfigUser.forEach(function(name) {
           if(name != userName)  {
               newUser.push(name);
           }
        });

        for( var name in lsConfigCu) {
            if(name != userName) {
                newConfigCu[name] = lsConfigCu[name];
            }
        }

        for( var name in lsConfigVp) {
            if(name != userName) {
                newConfigVp[name] = lsConfigVp[name];
            }
        }

        for( var name in lsConfigWif) {
            if(name != userName) {
                newConfigWif[name] = lsConfigWif[name];
            }
        }

        // save ne localStorage
        localStorage.setItem('config_user', JSON.stringify(newUser));
        localStorage.setItem('config_cu', JSON.stringify(newConfigCu));
        localStorage.setItem('config_vp', JSON.stringify(newConfigVp));
        localStorage.setItem('config_wif', JSON.stringify(newConfigWif));
        localStorage.setItem('config_amount', newConfigAmount);

        tabBodyItemPael.tabs('refresh');
    } else {
        $('#config-form-'+index).remove();
    }
});
/* add new user form */
$body.on('click', '.b-add', function() {
    addNewUserForm()
});

$body.tooltip();