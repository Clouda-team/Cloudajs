/**
  * usage: fw.domdiff.merge(g('dom1'),g('dom2'));
  */

(function(fw){
    
  fw.addSubPackage('domdiff');


  var debug = false;

  var g = function(id){
    return document.getElementById(id);
  }

  var util = {
    make : function(tagName, content) {
      var e = document.createElement(tagName);
      if(content) e.innerHTML = content;
      return e;
    },
    log : function() {
      if(debug) {
        console.log.apply(console, arguments)
      }
    },
    arrayCopy : function(arr) {
      var narr = [], a, l=arr.length;
      for(a=0; a<l; a++) { narr[a] = arr[a]; }
      return narr;
    },
    snapshot : function(list) {
      var newlist = [], i=0, last=list.length;
      for(;i<last;i++) { newlist.push(list[i]); }

      newlist.contains = (function(last, i) {
        return function(e) {
          for(i=0;i<last;i++) {
            if(equal(e, this[i])===0) {
              return i; }}
          return -1; }; }(last));

      return newlist;
    },

    hashCode : function(str,undef) {
      if(str===null || str===undef) return 0;

      var hash = 0, i, last = str.length;
      for (i = 0; i < last; ++i) {
        hash = (hash * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
      }
      return hash;
    },

    /*递归实现element的hash*/
    hashAll : function(element, undef) {
      var child,
          last = (element.childNodes === undef ? 0 : element.childNodes.length),
          hash = 0,
          hashString = element.nodeName;

      if(element.attributes) {
        var attr,
            a,
            attributes = element.attributes,
            len = attributes.length;
        for (a=0; a<len; a++) {
          attr = attributes[a];
          hashString += attr.nodeName+":"+attr.nodeValue;
        }
      }

      hash = util.hashCode( (hashString+element.textContent).replace(/\s+/g,''));
      
      for(child = last-1; child >=0; child--) {
        hash = (hash * 31 + util.hashAll(element.childNodes[child])) & 0xFFFFFFFF;
      }
      
      element["hashCode"] = hash;
      return hash;
    },
    serialise : function(e) {
      if(e.nodeType===3) {
        return "{ nodeType: 'text', text: '"+e.textContent.trim()+"'}";
      }

      var ret = ['nodeName: "'+e.nodeName+'"'],
          attrs = ['id', 'style', 'class', 'value'],/*more attribute*/
          attr, a, val;

      for(a=attrs.length-1; a>=0; a--) {
        attr = attrs[a];
        if(!attr || Object.hasOwnProperty(e,attr) || !e.getAttribute) continue;
        val = e.getAttribute(attr);
        if(val === undefined || val === null || typeof val === "function") { continue; }
        else { ret.push(attr + ': "' + val + '"'); }
      }

      var last = e.childNodes.length, child, children;
      if(last>0) {
        children = [];
        for(a=0; a<last; a++) {
          child = e.childNodes[a];
          children.push(util.serialise(child));
        }
        ret.push("children: [" + children.join(", ") + "]");
      }

      return "{" + ret.join(", ") + "}";
    },
    find: function(e,treeRoute) {
      var route = util.snapshot(treeRoute),
          pos = route.splice(0,1)[0];
      while(pos!==-1) {
        e = e.childNodes[pos];
        pos = route.splice(0,1)[0];
      }
      return e;
    }
  }

  var getDiff = function(e1, e2) {
    var route = equal(e1,e2),
        routes = [route],
        newRoute;

    while(typeof route === "object") {
      newRoute = equal(e1,e2,util.arrayCopy(route));
      routes.push(newRoute);
      route = newRoute;
    }

    if(routes.length>1) { routes.splice(routes.indexOf(0), 1); }
    return routes;
  };

  var equal = function(e1, e2, after) {
    var soffset = (after && after.length!==0 ? after.splice(0,1)[0] : 0);
    if(soffset === -1) {
      return 0;
    }

    if(e1.nodeType !== e2.nodeType) {
      return -1;
    }

    if(e1.nodeType===3 && e2.nodeType===3) {
      if(e1.textContent.trim() != e2.textContent.trim()) {
        return -1;
      }
      return 0;
    }

    if(e1.nodeName !== e2.nodeName) {
      return -1;
    }

    if(e1.childNodes.length !== e2.childNodes.length) {
      return -1;
    }

    var i, last = e1.childNodes.length, eq, ret;
    for(i=soffset; i<last; i++) {
      eq = equal(e1.childNodes[i], e2.childNodes[i], after);
      if(eq !== 0)
      {
        return [i].concat(eq);
      }
    }

    var attrs = ["id",    
                 "style",  // FIXME: 粒度到下一级
                 "class",  // FIXME: 粒度到下一级
                 "type",
                 "value",
                 "href",
                 "src",
                 "rel",
                 "__more__attributes__here__"],
        a, last = attrs.length,
        attr, a1, a2;

    for(a=0; a<last; a++) {
      attr = attrs[a];
      a1 = e1.getAttribute(attr);
      a2 = e2.getAttribute(attr);
      if(a1==a2 || (!a1 && a2=="") || (!a2 && a1=="")) continue;
      return -1;
    }

    return 0;
  };

  function outerEquality(e1, e2) {
    var diff = [];
    
    if(e1.nodeType===1 && e2.nodeType===1) {
      if(e1.nodeName !== e2.nodeName) {
        diff.push(["nodeName",e1.nodeName,e2.nodeName]);
      }
    }

    if(e1.attributes && e2.attributes) {
      var attributes = e1.attributes,
          len = attributes.length,
          a, a1, a2, attr;
      
      for (a=0; a<len; a++) {
        attr = attributes[a].nodeName;
        a1 = e1.getAttribute(attr);
        a2 = e2.getAttribute(attr);
        if(a1==a2) continue;
        diff.push([attr,a1,a2]);
      }
      
      attributes = e2.attributes;
      len = attributes.length;
      for (a=0; a<len; a++) {
        attr = attributes[a].nodeName;
        a1 = e1.getAttribute(attr);
        a2 = e2.getAttribute(attr);
        if(a1==a2) continue;
        diff.push([attr,a1,a2]);
      }
    }
    return diff;
  };

  var innerEquality = function(e1, e2) {
    util.hashAll(e1);
    util.hashAll(e2);
    c1 = util.snapshot(e1.childNodes);
    c2 = util.snapshot(e2.childNodes);
    var localdiff = childDiff(c1,c2);
    return (localdiff.insertions.length > 0 || localdiff.removals.length > 0 ?  localdiff : false);
  };
  innerEquality = innerEquality;

  function getPositions(list, reference) {
    var hash = reference.hashCode,
        c, last = list.length, child,
        result = [];
    for(c=0; c<last; c++) {
      child = list[c];
      if(child.hashCode === hash) {
        result.push(c);
      }
    }
    return result;
  }

  function childDiff(c1, c2) {
    var relocations = [],
        insertions = [],
        removals = [];

    var c, last=c1.length, child, hash, positions, pos;
    for(c=0; c<last; c++) {
      child = c1[c];
      positions = getPositions(c2, child);

      if(positions.length===0) continue;

      if(positions.length>1) continue;

      pos = positions[0];
      if(c!==pos && getPositions(c1, child).length <= 1) {
        relocations.push([c, pos]);
        child["marked"] = true;
        c2[pos]["marked"] = true;
      }

      else if(c===pos) {
        child["marked"] = true;
        c2[pos]["marked"] = true;
      }
    }

    last = c2.length;
    for(c=0; c<last; c++) {
      child = c2[c];
      if(!child["marked"]) {
        removals.push([c, child]);
      }
    }
    
    last = c1.length;
    for(c=0; c<last; c++) {
      child = c1[c];
      if(!child["marked"]) {
        insertions.push([c, child]);
      }
    }

    var localdiff = {
      c1: util.snapshot(c1),
      c2: util.snapshot(c2),
      relocations: relocations,
      insertions: insertions,
      removals: removals
    };
    return localdiff;
  }
  /**
   * d1 : new dom
   * d2 : 需要修改的dom
   */
  var merge = function(d1,d2,dontUpdate) {

    var routes = getDiff(d1,d2), route, iroute,
        d, lastRoute = routes.length, v,
        textAreaContent="";

    if(lastRoute===1 && routes[0]===0) { return false; }

    for(d = 0; d < lastRoute; d++)
    {
      if (routes[d] === 0) { continue; }

      if (routes[d] === -1) { routes[d] = [-1]; }

      route = util.arrayCopy(routes[d]),
      iroute = util.arrayCopy(routes[d]);
      var diffRoute = "difference route: " + route,
          e1 = d1, e2 = d2,
          e = route.splice(0,1)[0];
      while (e !== -1) {
        e1 = e1.childNodes[e];
        e2 = e2.childNodes[e];
        e = route.splice(0,1)[0]; }

      if(e1.nodeType===3 && e2.nodeType===3) {
        textAreaContent += diffRoute + "\n" +
                           "e1: " + (e1? util.serialise(e1) : "<missing>") + "\n" +
                           "e2: " + (e2? util.serialise(e2) : "<missing>") + "\n" +
                           "\n";

        if(!dontUpdate) {
          var element = util.find(d2,iroute),
              parent = element.parentNode;
          parent.replaceChild(e1,element);
        }
      }

      else {
        var complexDiff = innerEquality(e1,e2),
            pos, last, entry;

        textAreaContent += "complex " + diffRoute + "\n";

        var outerDiff = outerEquality(e1,e2);
        if(outerDiff.length>0) {
          textAreaContent += "  outerHTML changes: \n";
          last = outerDiff.length;
          for(pos=0; pos<last; pos++) {
            entry = outerDiff[pos];
            
            if(entry[0]==="nodeName") {
              textAreaContent += "    tag name difference. left: '"+entry[1]+"', right: '"+entry[2]+"'\n";

              if(!dontUpdate) {
                var element = util.find(d2,iroute),
                    newElement = document.createElement(entry[1]);
                while(element.childNodes.length>0) {
                  newElement.appendChild(element.childNodes[0]);
                }
                newElement.attributes = element.attributes;
                element.parentNode.replaceChild(newElement, element);
              }
            }
            
            else {
              textAreaContent += "    attribute: '"+entry[0]+"', left: '"+entry[1]+"', right: '"+entry[2]+"'\n";

              if(!dontUpdate) {
                var element = util.find(d2,iroute);
                if(entry[1]==null) { element.removeAttribute(entry[0]); }
                else { element.setAttribute(entry[0], entry[1]); }
              }
            }
          }
        }

        if(!complexDiff) {
          textAreaContent += "\n";
          continue;
        }

        last = complexDiff.removals.length;
        if(last>0) {
          textAreaContent += "  removals: \n";
          for(pos=last-1; pos>=0; pos--) {
            entry = complexDiff.removals[pos];
            textAreaContent += "    right["+entry[0]+"] ("+util.serialise(entry[1])+")\n";

            if(!dontUpdate) {
              var element = util.find(d2,iroute).childNodes[entry[0]],
                  parent = element.parentNode;
              parent.removeChild(element);
              

              // FIXME: clean up this code
              for(var i=0; i<complexDiff.relocations.length; i++) {
                var relocation = complexDiff.relocations[i];
                if(relocation[1] >= entry[0]) {
                  relocation[1]--;
                }
              }

            }
          }
        }

        last = complexDiff.insertions.length;
        if(last>0) {
          textAreaContent += "  insertions: \n";
          for(pos=0; pos<last; pos++) {
            entry = complexDiff.insertions[pos];
            textAreaContent += "    left["+entry[0]+"] ("+util.serialise(entry[1])+")\n";

            if(!dontUpdate) {
              var element = util.find(d2,iroute);
              element.insertBefore(entry[1], element.childNodes[entry[0]]);

              // FIXME: clean up this code
              for(var i=0; i<complexDiff.relocations.length; i++) {
                var relocation = complexDiff.relocations[i];
                if(relocation[1] >= entry[0]) {
                  relocation[1]++;
                }
              }

            }
          }
        }

        last = complexDiff.relocations.length;
        if(last>0) {
          textAreaContent += "  relocations: \n";

          var element, nodes, nlen,
              child, next,
              oldPos, newPos;

          for(pos=last-1; pos>=0; pos--) {
            element = util.find(d2,iroute);
            nodes = element.childNodes;
            entry = complexDiff.relocations[pos];
            textAreaContent += "    left["+entry[0]+"] <-> right["+entry[1]+"]\n";// ("+util.serialise(nodes[entry[1]])+")\n";

            if(false && !dontUpdate) {
              nlen = nodes.length;
              oldPos = entry[1];
              child = element.childNodes[oldPos];
              newPos = entry[0];
              next = (newPos<nlen ? element.childNodes[newPos] : child);

              if(child===next) {
                element.appendChild(child);
              }

              else {
                element.insertBefore(child, next);
              }

            }
          }
        }

        textAreaContent += "\n";
      }
    }

    //console.log((!dontUpdate? "[diff used in update]\n\n" : '') + textAreaContent);
    return true;
  };

  fw.domdiff.__reg('merge', merge, 'private');
})(sumeru);