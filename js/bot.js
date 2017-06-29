/**
 *
 *
 * @author AUTHOR <webentry>
 * @package
 * @link http://webentry.ru
 * @copyright 2017 Webentry
 */
    
var vars = {};
var configAmount;
var previousConfigAmount;
var $body = $('body');
var menuConfigTmpl = $('#menu-config');
var menuConfigPael = $('.b-config__body');
var tabsListElTmpl = $('#tabs-item');
var tabListPael = $('.b-tabs__list');
var curatorItemTmpl = $('#curators-item');
var tabBodyItemTmpl = $('#tabs-body-item');
var tabBodyItemPael = $('.b-tabs');
var configBtn = $('.b-header__menu');

/* crete necessary  variables */

addContent();

/* start websocket fetching */
steem.api.streamBlock(function (err, result) {
    if(result) {
        for (var k = 0; k < configAmount; k+=1 ) {

            var currentVars = vars[k];

            if(currentVars && currentVars['isBotRun'] && currentVars['isReadyForAnalyze'] && !currentVars['wasDelete']) {

                var transactions = result.transactions;
                var currentTransactions = [];
                var currentOperations = [];
                var currentVarsProgress = currentVars['progress'];
                var currentVarsElems = currentVars['elems'];

                if(transactions && transactions.length) {
                    transactions.forEach(function(transaction) {
                        currentTransactions.push(transaction);
                    });
                }

                if(currentTransactions.length) {
                    currentTransactions.forEach(function(transaction) {
                        currentOperations = transaction.operations;
                    });
                }

                if(currentOperations.length) {
                    currentOperations.forEach(function(operation) {
                        if(operation[0] == 'vote') {
                            if(isProperCuratorVote(operation, k)) {
                                // 15*60*1000
                                operation[2] = Date.now();
                                pushToVotes(operation, k);

                            }
                        }
                    });
                }

                if (currentVars['votes'].length) {
                    makeVote(k);
                }

                /* increase general status */
                if (currentVarsProgress['amount'] != 100) {
                    currentVarsElems['progressBarEl'].css('width', currentVarsProgress['amount'] + '%');
                    currentVarsProgress['amount'] += 1;
                } else {
                    currentVarsProgress['amount'] = 1;
                }

                getVotingPower(k);

                /* increase total operation amount */
                currentVarsProgress['total'] += 1;
                currentVarsElems['totalEl'].text(currentVarsProgress['total']);
            }

        }

    }
});

/* Check if voter is our curator */
function isProperCuratorVote(operation, k) {
    var isNeedToBeVoted = false;
    var voter = operation[1].voter;

    vars[k]['curators'].forEach(function(curator) {

        if($.trim(curator) == voter) {
            isNeedToBeVoted = true;
        }

    });

    return isNeedToBeVoted;
}

/* push votes to array in case if the are not dabbeling */
function pushToVotes(operation, index) {
    var isAlreadyIn = false;
    vars[index]['votes'].forEach(function(old) {
        if(old[1].permlink == operation[1].permlink) {
            isAlreadyIn = true;
        }
    });

    if(!isAlreadyIn) {
        vars[index]['votes'].push(operation);
    } else {
        console.log('repeatable article, ' + operation[1].permlink)
    }
}

/* get voting power */
function getVotingPower(index) {
    var me = [vars[index]['me']];
    var currentElems = vars[index]['elems'];
    var userIconEl = currentElems['userIconEl'];

    function getuserStatus(gests) {
        var realGests = parseFloat(gests, 10)/1000;
        var url;

        if (realGests >= 0 && realGests < 999) {
            url = 'url(../img/fish-icon-200x200.png)';
        }
        if (realGests >= 1000 && realGests < 9999) {
            url = 'url(../img/malek-icon-200x200.png)';
        }
        if (realGests >= 10000 && realGests < 99999) {
            url = 'url(../img/dophin-icon-200x200.png)';
        }
        if (realGests >= 100000 && realGests < 999999) {
            url = 'url(../img/killer-whale-icon-200x200.png)';
        }
        if (realGests >= 1000000) {
            url = 'url(../img/whale-icon-200x200.png)';
        }

        currentElems['userStatusIconEl'].css('background-image',url);

    }

    steem.api.getAccounts(me, function(err, result) {
        if(result && result[0]) {
            var resultData = result[0];
            getuserStatus(resultData['vesting_shares'].replace(' GESTS', ''));

            currentElems['votePowerEl'].text((resultData['voting_power']/100) + '%');
            currentElems['userGolosEl'].text(Math.round(resultData['balance'].replace(' GOLOS', '') * 100) / 100);
            currentElems['userPostsEl'].text(resultData['post_count']);

            if(!userIconEl) {
                userIconEl = currentElems['userIconEl'] = $('.b-tabs__user_icon--'+ me);
                var metaData = result[0].json_metadata ? JSON.parse(result[0].json_metadata) : null;
                var userImg = metaData && metaData.profile ? metaData.profile.profile_image : null;

                if(userImg) {
                    userIconEl.attr('src', userImg);
                }
            }
        }
    });

    steem.api.getFollowCount(me[0], function(err, result) {
        if(result) {
            currentElems['userSubscriptionsEl'].text(result['following_count']);
            currentElems['userStatusEl'].text(result['follower_count']);
        }
    });
};

/* make vote following the curator */
function makeVote(index){
      var length = vars[index]['votes'].length;
      var amountVoting = 0;

    vars[index]['votes'].forEach(function(vote) {
          var author = vote[1].author;
          var voter = vote[1].voter;
          var permlink = vote[1].permlink;

          steem.api.getContent(author, permlink, function(err, result) {

              var isNeedVote = true;
              var contentResult = result;

              result['active_votes'].forEach(function(voter) {
                  if(voter.voter == vars[index]['me']) {
                      isNeedVote = false;
                  }
              });

              if(isNeedVote) {
                  steem.broadcast.vote(vars[index]['wif'], vars[index]['me'], author, permlink, vars[index]['votePower'], function(err, voteResult) {
                      addToList({
                          voter: voter,
                          author: author,
                          permlink: permlink,
                          title: contentResult.title,
                          url: contentResult.url
                      }, index);
                  });

                  /* increase voting operation amount */
                  vars[index]['progress']['votes'] += 1;
                  vars[index]['elems']['votesEl'].text(vars[index]['progress']['votes']);
                  console.log(voter, 'voting');
              } else {
                  /* increase unvoting operation amount */
                  vars[index]['progress']['unvotes'] += 1;
                  vars[index]['elems']['unVotesEl'].text(vars[index]['progress']['unvotes']);
                  console.log(voter, 'not voting for: ' + permlink);
              }


              amountVoting +=1;

              if(amountVoting == length) {
                  console.log('votes were: ' + length, 'amountVoting were done: ' + amountVoting);
                  vars[index]['votes'] = [];
              }
          });

      });


}

/* add article info to the list */
function addToList(data, index) {
    var tmplData = {
        voter: data.voter,
        title: data.title,
        url: data.url
    };

    if(vars[index]['elems']['beforeTextEl'].css('display') != 'none') {
        vars[index]['elems']['beforeTextEl'].hide();
    }

    $('#vote-item').tmpl(tmplData).appendTo(vars[index]['elems']['votesContentEl']);

}

function saveToLs(name, value, userName) {
    var itemFromLs = getFromLs(name) ? getFromLs(name) : (name == 'config_user') ? [] : {};
    function pushToArray(array, value) {
        if(array.length) {
            array.forEach(function(v) {
                if(v != value) {
                    array.push(value);
                }
            });
        } else {
            array.push(value);
        }
    }

    if(value) {
        if(name != 'config_user') {
            if(!itemFromLs[userName]) {
                itemFromLs[userName] = '';
                itemFromLs[userName] = value;
            } else {
                itemFromLs[userName] = value;
            }
        } else {
            pushToArray(itemFromLs, value);
        }

        localStorage.setItem(name, JSON.stringify(itemFromLs));

        localStorage.setItem('config_amount', getFromLs('config_user').length);
        configAmount = getFromLs('config_user').length;
    }
}

function getFromLs(name) {
    return JSON.parse(localStorage.getItem(name));
}

function addContent(isNeedRefresh) {
    configAmount = getFromLs('config_amount') || 0;


    if(configAmount) {
        if(!isNeedRefresh) {
            for (var j = 0; j < configAmount; j+=1 ) {

                addMainTmpls(j);

                if(!vars[j]) {
                    vars[j] = {};
                    vars[j]['elems'] = {};
                    vars[j]['progress'] = {};
                    vars[j]['isBotRun'] = false;
                    vars[j]['isReadyForAnalyze'] = false;
                    vars[j]['wasDelete'] = false;
                    vars[j]['me'] = null;
                    vars[j]['curators'] = null;
                    vars[j]['wif'] = null;
                    vars[j]['votePower'] = null;
                    vars[j]['votes'] = [];
                    vars[j]['elems']['curatorsEl'] = $('#curators-'+j);
                    vars[j]['elems']['wifEl'] = $('#wif-'+j);
                    vars[j]['elems']['totalEl'] = $('#total-'+j);
                    vars[j]['elems']['votesEl'] = $('#votes-'+j);
                    vars[j]['elems']['unVotesEl'] = $('#unvotes-'+j);
                    vars[j]['elems']['votesContentEl'] = $('#votes-content-'+j);
                    vars[j]['elems']['progressBarEl'] = $('#progress-bar-'+j);
                    vars[j]['elems']['progressLabelEl'] = $('#progress-label-'+j);
                    vars[j]['elems']['beforeTextEl'] = $('#before-text-'+j);
                    vars[j]['elems']['votePowerEl'] = $('#v-power-'+j);
                    vars[j]['elems']['curatorsEl'] = $('#curators-'+j);
                    vars[j]['elems']['userStatusEl'] = $('#user-gests-status-'+j);
                    vars[j]['elems']['userPostsEl'] = $('#user-posts-'+j);
                    vars[j]['elems']['userSubscriptionsEl'] = $('#user-subscribes-'+j);
                    vars[j]['elems']['userGolosEl'] = $('#user-golos-'+j);
                    vars[j]['elems']['userStatusIconEl'] = $('#user-status-icon-'+j);
                    vars[j]['progress']['amount'] = 1;
                    vars[j]['progress']['votes'] = 0;
                    vars[j]['progress']['unvotes'] = 0;
                    vars[j]['progress']['total'] = 0;
                }

            }
        }

        if(tabBodyItemPael.data('ui-tabs')) {
            tabBodyItemPael.tabs('refresh');
        } else {
            tabBodyItemPael.tabs();
        }
    }
}
/* add html to DOM */
function addMainTmpls(index) {
    var user = getFromLs('config_user')[index] || '';
    var configWif = getFromLs('config_wif')[user] || '';
    var configHideWif = configWif.replace(/./g, '*');

    if(!menuConfigPael.find('input[data-user="'+user+'"]').length) {
        menuConfigTmpl.tmpl({
            configUser: user,
            configVotePower: getFromLs('config_vp')[user] || '',
            configCurators: getFromLs('config_cu')[user] || '',
            configWif: configWif,
            configHideWif: configHideWif,
            index: index
        }).appendTo(menuConfigPael);
    }

    if(!tabBodyItemPael.find('#'+user).length) {
        tabsListElTmpl.tmpl({
            configUser: user
        }).appendTo(tabListPael);

        tabBodyItemTmpl.tmpl({
            configUser: user,
            configHideWif: configHideWif,
            configWif: configWif,
            index: index
        }).appendTo(tabBodyItemPael);
    }
}
/* make some manipulations with input before saving to LS */
function saveFiledsValues($input, userName, fieldName, value, index) {
    if(!userName) {
        switch(fieldName) {
            case 'config_user':
                $input.data('user', value);
                $input.attr('data-user', value);
                $('.b-delete[data-index="'+index+'"]').attr('data-user', value);
                userName = value;
                break;
            default:
                var user = $('#config-user-'+index).data('user');
                if(user) {
                    $input.data('user', user);
                    $input.attr('data-user', user);
                    userName = user;
                }
                break;
        }

        saveToLs(fieldName, value, userName);
    } else {
        saveToLs(fieldName, value, userName);
    }
}
/* add html form for new user */
function addNewUserForm() {
    var index = $('.b-config__form').length;
    var $form;

    $('#menu-config').tmpl({
        configUser: '',
        configVotePower: '',
        configCurators:  '',
        configWif: '',
        configHideWif: '',
        index: index
    }).appendTo(menuConfigPael);

    $form = $('#config-form-'+index);

    $form.submit(function() {
        return false;
    });

    $form.parsley();
    $form.parsley().on('form:success', function(e) {
        var inputs = $form.find('.b-config-input');

        inputs.each(function(i, input) {
            var $input = $(input);
            var userName = $input.data('user') || undefined;
            var fieldName = $input.data('name');
            var value = $.trim($input.val());
            var index = typeof $input.data('index') == 'number' ? $input.data('index') : $input.data('index').replace('wif','');

            saveFiledsValues($input, userName, fieldName, value, index);
        });

        $form.find('.b-config__item--submit').hide();
    });
}
/* enable inputs */
function enableFields(form) {
    var inputParents = form.find('.b-config__item');
    var inputs = form.find('.b-config-input');

    inputParents.removeClass('b-config__item--disabled');
    inputs.prop('disabled', false);
}
/* disable inputs */
function disableFields(form) {
    var inputParents = form.find('.b-config__item');
    var inputs = form.find('.b-config-input');

    inputParents.each(function(i, parent) {
        var $parent = $(parent);
        if(!$parent.hasClass('b-config__item--main')) {
            $parent.addClass('b-config__item--disabled');
        }
    });
    inputs.each(function(i, input) {
        var $input = $(input);
        if($input.data('name') != 'config_user') {
            $input.prop('disabled', true)
        }
    });
}

